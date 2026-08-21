/*
 * User data — read + write (SPEC §4.3). Owner scoping is enforced by RLS; every
 * insert carries the session user_id and a client-generated UUID so offline
 * inserts (Phase 5) will not need a round trip. Phase 4 is online-only: writes
 * go straight to Supabase and invalidate the relevant queries.
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from './supabase';
import { useAuth } from './AuthProvider';
import type { Tables, TablesInsert } from './database.types';

export type Race = Tables<'races'>;
export type WorkoutLog = Tables<'workout_logs'>;
export type WorkoutLogSet = Tables<'workout_log_sets'>;
export type SaunaLog = Tables<'sauna_logs'>;
export type MealPlanEntry = Tables<'meal_plan_entries'>;
export type BasketItem = Tables<'basket_items'>;
export type ShoppingCheck = Tables<'shopping_checks'>;
export type UserSettings = Tables<'user_settings'>;

const uuid = () => crypto.randomUUID();

/** Current user id from the session; throws if called while signed out. */
export function useUserId(): string {
  const { session } = useAuth();
  const id = session?.user.id;
  if (!id) throw new Error('Not authenticated');
  return id;
}

// User data changes, so it must be considered stale (the global default is
// staleTime: Infinity for immutable reference data).
const userQ = { staleTime: 0 } as const;

// ---- Races -----------------------------------------------------------------

export function useRaces() {
  const userId = useUserId();
  return useQuery({
    ...userQ,
    queryKey: ['races', userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('races')
        .select('*')
        .order('race_date', { ascending: true });
      if (error) throw error;
      return (data ?? []) as Race[];
    },
  });
}

/** The starred A race, or null. */
export function useTargetRace(): Race | null {
  const { data } = useRaces();
  return data?.find((r) => r.is_target) ?? null;
}

type AddRaceInput = Omit<TablesInsert<'races'>, 'id' | 'user_id' | 'is_target'> & {
  asTarget?: boolean;
};

export function useAddRace() {
  const userId = useUserId();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ asTarget, ...fields }: AddRaceInput) => {
      // The first race auto-becomes the A race; otherwise only when explicitly
      // ticked. Adding a race without ticking must not steal A-race status (SPEC §6.3).
      const { count } = await supabase.from('races').select('id', { count: 'exact', head: true });
      const makeTarget = asTarget || (count ?? 0) === 0;
      if (makeTarget) {
        // Clear any existing target first to respect races_one_target.
        const un = await supabase
          .from('races')
          .update({ is_target: false })
          .eq('user_id', userId)
          .eq('is_target', true);
        if (un.error) throw un.error;
      }
      const row: TablesInsert<'races'> = {
        ...fields,
        id: uuid(),
        user_id: userId,
        is_target: makeTarget,
      };
      const { error } = await supabase.from('races').insert(row);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['races', userId] }),
  });
}

export function useDeleteRace() {
  const userId = useUserId();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('races').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['races', userId] }),
  });
}

/** Star exactly one race. Unset the current target first to respect the
 *  `races_one_target` partial unique index. */
export function useStarRace() {
  const userId = useUserId();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const un = await supabase
        .from('races')
        .update({ is_target: false })
        .eq('user_id', userId)
        .eq('is_target', true);
      if (un.error) throw un.error;
      const { error } = await supabase.from('races').update({ is_target: true }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['races', userId] }),
  });
}

// ---- User settings (phase override, plan start) ----------------------------

export function useUserSettings() {
  const userId = useUserId();
  return useQuery({
    ...userQ,
    queryKey: ['user_settings', userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('user_settings')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();
      if (error) throw error;
      return (data ?? null) as UserSettings | null;
    },
  });
}

export function useUpdateSettings() {
  const userId = useUserId();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (patch: Partial<Omit<TablesInsert<'user_settings'>, 'user_id'>>) => {
      const { error } = await supabase
        .from('user_settings')
        .upsert({ user_id: userId, ...patch }, { onConflict: 'user_id' });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['user_settings', userId] }),
  });
}

/** Per-exercise rest-duration overrides, keyed by exercise slug. */
export type RestOverrides = Record<string, number>;

/**
 * Persist a single per-exercise rest default. Reads the current override map
 * first and merges, so setting one exercise never clobbers the others.
 */
export function useSetRestOverride() {
  const userId = useUserId();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ slug, seconds }: { slug: string; seconds: number }) => {
      const { data, error: readErr } = await supabase
        .from('user_settings')
        .select('rest_overrides')
        .eq('user_id', userId)
        .maybeSingle();
      if (readErr) throw readErr;
      const current = (data?.rest_overrides ?? {}) as RestOverrides;
      const next: RestOverrides = { ...current, [slug]: seconds };
      const { error } = await supabase
        .from('user_settings')
        .upsert({ user_id: userId, rest_overrides: next }, { onConflict: 'user_id' });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['user_settings', userId] }),
  });
}

// ---- Workout logs + sets ---------------------------------------------------

export function useWorkoutLogs() {
  const userId = useUserId();
  return useQuery({
    ...userQ,
    queryKey: ['workout_logs', userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('workout_logs')
        .select('*')
        .order('logged_on', { ascending: false });
      if (error) throw error;
      return (data ?? []) as WorkoutLog[];
    },
  });
}

/** All of the user's sets with their log's date, for prefill + stats. */
export interface SetWithDate extends WorkoutLogSet {
  logged_on: string;
}
export function useAllSets() {
  const userId = useUserId();
  return useQuery({
    ...userQ,
    queryKey: ['workout_sets', userId],
    queryFn: async (): Promise<SetWithDate[]> => {
      const { data, error } = await supabase
        .from('workout_log_sets')
        .select('*, workout_logs!inner(logged_on)');
      if (error) throw error;
      return (data ?? []).map((r) => {
        const { workout_logs, ...set } = r as WorkoutLogSet & {
          workout_logs: { logged_on: string };
        };
        return { ...set, logged_on: workout_logs.logged_on };
      });
    },
  });
}

export interface NewSet {
  exercise_slug: string;
  set_no: number;
  weight_kg: number;
  reps: number;
}
export interface NewWorkout {
  logged_on: string;
  session_key: string;
  session_name: string;
  phase_slug: string;
  notes?: string;
  sets: NewSet[];
}

export function useSaveWorkout() {
  const userId = useUserId();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (w: NewWorkout) => {
      const logId = uuid();
      const log: TablesInsert<'workout_logs'> = {
        id: logId,
        user_id: userId,
        logged_on: w.logged_on,
        session_key: w.session_key,
        session_name: w.session_name,
        phase_slug: w.phase_slug,
        notes: w.notes ?? null,
      };
      const { error: logErr } = await supabase.from('workout_logs').insert(log);
      if (logErr) throw logErr;
      if (w.sets.length) {
        const rows: TablesInsert<'workout_log_sets'>[] = w.sets.map((s) => ({
          id: uuid(),
          workout_log_id: logId,
          ...s,
        }));
        const { error: setsErr } = await supabase.from('workout_log_sets').insert(rows);
        if (setsErr) throw setsErr;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['workout_logs', userId] });
      qc.invalidateQueries({ queryKey: ['workout_sets', userId] });
    },
  });
}

// ---- Sauna logs ------------------------------------------------------------

export function useSaunaLogs() {
  const userId = useUserId();
  return useQuery({
    ...userQ,
    queryKey: ['sauna_logs', userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('sauna_logs')
        .select('*')
        .order('logged_on', { ascending: false });
      if (error) throw error;
      return (data ?? []) as SaunaLog[];
    },
  });
}

export function useAddSaunaLog() {
  const userId = useUserId();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: Omit<TablesInsert<'sauna_logs'>, 'id' | 'user_id'>) => {
      const row: TablesInsert<'sauna_logs'> = { ...input, id: uuid(), user_id: userId };
      const { error } = await supabase.from('sauna_logs').insert(row);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['sauna_logs', userId] }),
  });
}

// ---- Meal plan -------------------------------------------------------------

export function useMealPlan() {
  const userId = useUserId();
  return useQuery({
    ...userQ,
    queryKey: ['meal_plan', userId],
    queryFn: async () => {
      const { data, error } = await supabase.from('meal_plan_entries').select('*');
      if (error) throw error;
      return (data ?? []) as MealPlanEntry[];
    },
  });
}

export function useSetMealPlan() {
  const userId = useUserId();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ plan_date, recipe_slug }: { plan_date: string; recipe_slug: string }) => {
      const { error } = await supabase
        .from('meal_plan_entries')
        .upsert(
          { id: uuid(), user_id: userId, plan_date, recipe_slug },
          { onConflict: 'user_id,plan_date' },
        );
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['meal_plan', userId] }),
  });
}

export function useClearMealPlanDay() {
  const userId = useUserId();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (plan_date: string) => {
      const { error } = await supabase
        .from('meal_plan_entries')
        .delete()
        .eq('user_id', userId)
        .eq('plan_date', plan_date);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['meal_plan', userId] }),
  });
}

// ---- Basket ----------------------------------------------------------------

export function useBasket() {
  const userId = useUserId();
  return useQuery({
    ...userQ,
    queryKey: ['basket', userId],
    queryFn: async () => {
      const { data, error } = await supabase.from('basket_items').select('*');
      if (error) throw error;
      return (data ?? []) as BasketItem[];
    },
  });
}

export function useToggleBasket() {
  const userId = useUserId();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ recipe_slug, inBasket }: { recipe_slug: string; inBasket: boolean }) => {
      if (inBasket) {
        const { error } = await supabase
          .from('basket_items')
          .delete()
          .eq('user_id', userId)
          .eq('recipe_slug', recipe_slug);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('basket_items')
          .upsert(
            { id: uuid(), user_id: userId, recipe_slug },
            { onConflict: 'user_id,recipe_slug' },
          );
        if (error) throw error;
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['basket', userId] }),
  });
}

export function useAddManyToBasket() {
  const userId = useUserId();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (slugs: string[]) => {
      if (!slugs.length) return;
      const rows = slugs.map((recipe_slug) => ({ id: uuid(), user_id: userId, recipe_slug }));
      const { error } = await supabase
        .from('basket_items')
        .upsert(rows, { onConflict: 'user_id,recipe_slug', ignoreDuplicates: true });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['basket', userId] }),
  });
}

export function useClearBasket() {
  const userId = useUserId();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from('basket_items').delete().eq('user_id', userId);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['basket', userId] }),
  });
}

// ---- Shopping checks (additive set: presence = ticked) ---------------------

export function useShoppingChecks() {
  const userId = useUserId();
  return useQuery({
    ...userQ,
    queryKey: ['shopping_checks', userId],
    queryFn: async () => {
      const { data, error } = await supabase.from('shopping_checks').select('*');
      if (error) throw error;
      return (data ?? []) as ShoppingCheck[];
    },
  });
}

export function useToggleCheck() {
  const userId = useUserId();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ item_key, checked }: { item_key: string; checked: boolean }) => {
      if (checked) {
        const { error } = await supabase
          .from('shopping_checks')
          .delete()
          .eq('user_id', userId)
          .eq('item_key', item_key);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('shopping_checks')
          .upsert({ id: uuid(), user_id: userId, item_key }, { onConflict: 'user_id,item_key' });
        if (error) throw error;
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['shopping_checks', userId] }),
  });
}

/*
 * Typed read-only queries for the seeded reference tables (SPEC §3.1).
 * All ordered by sort_order so display order matches the original app.
 */
import { useQuery } from '@tanstack/react-query';
import { supabase } from './supabase';
import type { Tables } from './database.types';

export type Exercise = Tables<'exercises'>;
export type Phase = Tables<'phases'>;
export type SessionTemplateRow = Tables<'session_templates'>;
export type SessionItem = Tables<'session_template_items'>;
export type SaunaType = Tables<'sauna_types'>;
export type SaunaScheduleRow = Tables<'sauna_schedule'>;
export type Recipe = Tables<'recipes'>;
export type RecipeIngredient = Tables<'recipe_ingredients'>;
export type RecipeStep = Tables<'recipe_steps'>;
export type Category = Tables<'ingredient_categories'>;
export type Cuisine = Tables<'cuisines'>;
export type Staple = Tables<'staples'>;

// Dynamic table name defeats supabase-js's overloaded `from()` typing, so we
// cast at this single boundary and re-attach the row type via the T cast.
async function fetchAll<T>(table: string, order: string): Promise<T[]> {
  const { data, error } = await supabase
    .from(table as never)
    .select('*')
    .order(order);
  if (error) throw error;
  return (data ?? []) as T[];
}

export const useExercises = () =>
  useQuery({ queryKey: ['exercises'], queryFn: () => fetchAll<Exercise>('exercises', 'sort_order') });

export const usePhases = () =>
  useQuery({ queryKey: ['phases'], queryFn: () => fetchAll<Phase>('phases', 'sort_order') });

export const useSessionTemplates = () =>
  useQuery({
    queryKey: ['session_templates'],
    queryFn: () => fetchAll<SessionTemplateRow>('session_templates', 'sort_order'),
  });

export const useSessionItems = () =>
  useQuery({
    queryKey: ['session_template_items'],
    queryFn: () => fetchAll<SessionItem>('session_template_items', 'sort_order'),
  });

export const useSaunaTypes = () =>
  useQuery({
    queryKey: ['sauna_types'],
    queryFn: () => fetchAll<SaunaType>('sauna_types', 'sort_order'),
  });

export const useSaunaSchedule = () =>
  useQuery({
    queryKey: ['sauna_schedule'],
    queryFn: () => fetchAll<SaunaScheduleRow>('sauna_schedule', 'sort_order'),
  });

export const useRecipes = () =>
  useQuery({ queryKey: ['recipes'], queryFn: () => fetchAll<Recipe>('recipes', 'sort_order') });

export const useRecipeIngredients = () =>
  useQuery({
    queryKey: ['recipe_ingredients'],
    queryFn: () => fetchAll<RecipeIngredient>('recipe_ingredients', 'sort_order'),
  });

export const useRecipeSteps = () =>
  useQuery({
    queryKey: ['recipe_steps'],
    queryFn: () => fetchAll<RecipeStep>('recipe_steps', 'step_no'),
  });

export const useCategories = () =>
  useQuery({
    queryKey: ['ingredient_categories'],
    queryFn: () => fetchAll<Category>('ingredient_categories', 'sort_order'),
  });

export const useCuisines = () =>
  useQuery({ queryKey: ['cuisines'], queryFn: () => fetchAll<Cuisine>('cuisines', 'sort_order') });

export const useStaples = () =>
  useQuery({ queryKey: ['staples'], queryFn: () => fetchAll<Staple>('staples', 'sort_order') });

/** Singleton jsonb content (sauna rules, pluralisation exceptions). */
export function useAppContent<T = unknown>(key: string) {
  return useQuery({
    queryKey: ['app_content', key],
    queryFn: async (): Promise<T | null> => {
      const { data, error } = await supabase
        .from('app_content')
        .select('value')
        .eq('key', key)
        .maybeSingle();
      if (error) throw error;
      return (data?.value ?? null) as T | null;
    },
  });
}

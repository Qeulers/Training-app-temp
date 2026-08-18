/*
 * Derives the planning context (target race date + phase override) from user
 * data, so Today / Calendar / Plan all read the same source of truth. Returns
 * loading/error so callers can gate rendering.
 */
import { useTargetRace, useUserSettings } from '@/data/user';
import type { PhaseOverride, PhaseSlug } from '@/domain/phase';
import type { DateStr } from '@/domain/dates';

export interface Planning {
  loading: boolean;
  error: unknown;
  raceDate: DateStr | null;
  override: PhaseOverride | null;
  planStart: DateStr;
}

const DEFAULT_PLAN_START = '2026-08-11'; // matches user_settings default (SPEC §4.3)

export function usePlanning(): Planning {
  const race = useTargetRace();
  const settings = useUserSettings();

  const s = settings.data;
  const override: PhaseOverride | null =
    s?.phase_override && s.phase_override_from
      ? { phase: s.phase_override as PhaseSlug, from: s.phase_override_from }
      : null;

  return {
    loading: settings.isPending,
    error: settings.error,
    raceDate: race?.race_date ?? null,
    override,
    planStart: s?.plan_start ?? DEFAULT_PLAN_START,
  };
}

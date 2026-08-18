/*
 * Phase calculation — SPEC §7.1, ported verbatim from legacy `autoPhaseFor` /
 * `phaseFor`. Comparisons are done on `YYYY-MM-DD` strings and Date objects
 * anchored at local midday, which is order-preserving for ISO date strings.
 */
import { parseLocalDate, type DateStr } from './dates';

export type PhaseSlug = 'p1' | 'p2' | 'p3' | 'recovery' | 'p4';

/** Manual phase pin: applies from `from` (inclusive) onward. */
export interface PhaseOverride {
  phase: PhaseSlug;
  from: DateStr;
}

const TAPER_DAYS = 26; // p3 (taper) starts race - 26 days
const P2_DAYS = 49; // p2 starts taperStart - 49 days
const RECOVERY_DAYS = 14; // recovery window ends race + 14 days

/**
 * Auto-calculated phase for a date, ignoring any manual pin.
 * With no target race, everything is the general block `p4`.
 */
export function autoPhase(dateStr: DateStr, raceDate: DateStr | null): PhaseSlug {
  if (!raceDate) return 'p4';
  const d = parseLocalDate(dateStr);
  const race = parseLocalDate(raceDate);

  const taperStart = new Date(race);
  taperStart.setDate(race.getDate() - TAPER_DAYS);
  const p2Start = new Date(taperStart);
  p2Start.setDate(taperStart.getDate() - P2_DAYS);
  const recovEnd = new Date(race);
  recovEnd.setDate(race.getDate() + RECOVERY_DAYS);

  if (d > race && d <= recovEnd) return 'recovery';
  if (d > recovEnd) return 'p4';
  if (d >= taperStart) return 'p3';
  if (d >= p2Start) return 'p2';
  return 'p1';
}

/**
 * Effective phase: a manual override wins from its `from` date forward,
 * otherwise the auto-calculated phase.
 */
export function phase(
  dateStr: DateStr,
  raceDate: DateStr | null,
  override?: PhaseOverride | null,
): PhaseSlug {
  if (override && override.phase && dateStr >= override.from) return override.phase;
  return autoPhase(dateStr, raceDate);
}

/** True when a manual pin is in effect for the given date. */
export function phaseIsPinned(dateStr: DateStr, override?: PhaseOverride | null): boolean {
  return !!(override && override.phase && dateStr >= override.from);
}

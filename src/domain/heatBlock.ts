/*
 * Heat-acclimation block — SPEC §7.2, ported from legacy `haBlock` / `inHaBlock`.
 *
 * A 14-day window finishing 3 days before race day, so the athlete arrives
 * adapted but not cooked. The block OVERRIDES the normal sauna schedule (see
 * sauna.ts); it does not stack.
 */
import { addDays, type DateStr } from './dates';

export const HA_BLOCK_LEN = 14;
export const HA_BLOCK_END_OFFSET = 3;

export interface HeatBlock {
  start: DateStr;
  end: DateStr;
}

/** The heat block window for a target race, or null when no race is set. */
export function heatBlock(raceDate: DateStr | null): HeatBlock | null {
  if (!raceDate) return null;
  const end = addDays(raceDate, -HA_BLOCK_END_OFFSET);
  const start = addDays(end, -(HA_BLOCK_LEN - 1));
  return { start, end };
}

/** True when `dateStr` falls within the (inclusive) heat block. */
export function inHeatBlock(dateStr: DateStr, raceDate: DateStr | null): boolean {
  const b = heatBlock(raceDate);
  return !!(b && dateStr >= b.start && dateStr <= b.end);
}

/*
 * Sauna slot resolution — SPEC §7.3, ported from legacy `saunaFor`.
 *
 * The heat block takes precedence over the normal per-phase schedule:
 *   - inside the block: rest Wed(3)/Fri(5); otherwise a single, non-optional
 *     `ha` slot. It OVERRIDES the schedule, it does not add to it.
 *   - outside the block: the `sauna_schedule` rows for the current phase whose
 *     `day_of_week` matches.
 *
 * Pure: the schedule rows are passed in (loaded from seed / Supabase upstream).
 */
import { dayOfWeek, type DateStr } from './dates';
import { inHeatBlock } from './heatBlock';
import { phase, type PhaseOverride } from './phase';

/** A row from the `sauna_schedule` reference table. */
export interface SaunaScheduleRow {
  phase_slug: string;
  slot_key: string;
  day_of_week: number;
  sauna_type_slug: string;
  is_optional: boolean;
  note: string | null;
  sort_order: number;
}

/** A resolved slot to render for a given day. */
export interface SaunaSlot {
  slot_key: string;
  sauna_type_slug: string;
  is_optional: boolean;
  note: string | null;
  /** True when this slot comes from the heat block override. */
  is_block: boolean;
}

const HEAT_BLOCK_NOTE =
  'Heat block — one of 14. Consistency is the whole point; a missed day is a lost day.';

export interface SaunaContext {
  raceDate: DateStr | null;
  schedule: SaunaScheduleRow[];
  override?: PhaseOverride | null;
}

/** Resolve the sauna slot(s) for a date. Returns `[]` for rest days. */
export function saunaFor(dateStr: DateStr, ctx: SaunaContext): SaunaSlot[] {
  const dow = dayOfWeek(dateStr);

  if (inHeatBlock(dateStr, ctx.raceDate)) {
    // 5 sessions a week during the block: rest Wed(3) and Fri(5).
    if (dow === 3 || dow === 5) return [];
    return [
      {
        slot_key: 'sa_ha',
        sauna_type_slug: 'ha',
        is_optional: false,
        note: HEAT_BLOCK_NOTE,
        is_block: true,
      },
    ];
  }

  const ph = phase(dateStr, ctx.raceDate, ctx.override);
  return ctx.schedule
    .filter((row) => row.phase_slug === ph && row.day_of_week === dow)
    .sort((a, b) => a.sort_order - b.sort_order)
    .map((row) => ({
      slot_key: row.slot_key,
      sauna_type_slug: row.sauna_type_slug,
      is_optional: row.is_optional,
      note: row.note,
      is_block: false,
    }));
}

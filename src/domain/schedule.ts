/*
 * Strength session scheduling — SPEC §7.5.
 *
 * Sessions come from `session_templates` for the current phase, matched on
 * `day_of_week`. Standard phases train Tue(2)/Thu(4)/Sat(6); Sun(0) is the long
 * run and must stay clear of eccentric work — see the `stepdown`-on-day-0 test.
 *
 * Pure: templates are passed in (loaded from seed / Supabase upstream).
 */
import { dayOfWeek, type DateStr } from './dates';
import { phase, type PhaseOverride } from './phase';

/** A row from the `session_templates` reference table. */
export interface SessionTemplate {
  slug: string;
  phase_slug: string;
  session_key: string;
  name: string;
  day_of_week: number;
  duration_label: string;
  brief: string | null;
  sort_order: number;
}

export interface ScheduleContext {
  raceDate: DateStr | null;
  templates: SessionTemplate[];
  override?: PhaseOverride | null;
}

/** The strength session(s) scheduled for a date, in sort order. */
export function sessionsFor(dateStr: DateStr, ctx: ScheduleContext): SessionTemplate[] {
  const ph = phase(dateStr, ctx.raceDate, ctx.override);
  const dow = dayOfWeek(dateStr);
  return ctx.templates
    .filter((t) => t.phase_slug === ph && t.day_of_week === dow)
    .sort((a, b) => a.sort_order - b.sort_order);
}

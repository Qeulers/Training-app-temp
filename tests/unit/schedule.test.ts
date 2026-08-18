import { describe, it, expect } from 'vitest';
import { sessionsFor, type SessionTemplate } from '@/domain/schedule';
import templatesJson from '../../data/session_templates.json';
import itemsJson from '../../data/session_template_items.json';

const templates = templatesJson as SessionTemplate[];
const items = itemsJson as Array<{ session_template_slug: string; exercise_slug: string }>;

const RACE = '2027-07-30';

describe('sessionsFor — SPEC §7.5', () => {
  // 2027-06-01 is p2, a Tuesday(2) -> the p2 Tuesday session.
  it('returns the phase template(s) matching the weekday', () => {
    const sessions = sessionsFor('2027-06-01', { raceDate: RACE, templates });
    expect(sessions.length).toBeGreaterThan(0);
    expect(sessions.every((s) => s.phase_slug === 'p2')).toBe(true);
    expect(sessions.every((s) => s.day_of_week === 2)).toBe(true);
  });

  it('returns nothing on a Sunday(0) long-run day in standard phases', () => {
    // 2027-05-30 is a Sunday, p2.
    expect(sessionsFor('2027-05-30', { raceDate: RACE, templates })).toEqual([]);
  });
});

describe('safety invariant — SPEC §7.5', () => {
  it('never schedules a session containing `stepdown` on day 0 (Sunday)', () => {
    const day0Slugs = new Set(templates.filter((t) => t.day_of_week === 0).map((t) => t.slug));
    const offenders = items.filter(
      (it) => it.exercise_slug === 'stepdown' && day0Slugs.has(it.session_template_slug),
    );
    expect(offenders).toEqual([]);
  });
});

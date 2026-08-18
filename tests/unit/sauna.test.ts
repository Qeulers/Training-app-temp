import { describe, it, expect } from 'vitest';
import { saunaFor, type SaunaScheduleRow } from '@/domain/sauna';
import { addDays, dayOfWeek } from '@/domain/dates';
import scheduleJson from '../../data/sauna_schedule.json';

const schedule = scheduleJson as SaunaScheduleRow[];
const RACE = '2027-07-30';
const ctx = { raceDate: RACE, schedule };

describe('saunaFor — SPEC §7.3', () => {
  it('outside the block, returns the phase schedule rows for the weekday', () => {
    // 2027-06-06 is a Sunday(0), p2. p2 has a Sunday post slot in the seed.
    const slots = saunaFor('2027-06-06', ctx);
    expect(slots.length).toBeGreaterThan(0);
    expect(slots.every((s) => !s.is_block)).toBe(true);
  });

  it('inside the block on a training day, returns a single non-optional `ha` slot', () => {
    // 2027-07-15 is a Thursday(4), inside the block (07-14..07-27).
    const slots = saunaFor('2027-07-15', ctx);
    expect(slots).toHaveLength(1);
    expect(slots[0]).toMatchObject({
      sauna_type_slug: 'ha',
      is_optional: false,
      is_block: true,
    });
  });

  it('inside the block, rests Wed(3) and Fri(5) and trains every other day', () => {
    for (let d = '2027-07-14'; d <= '2027-07-27'; d = addDays(d, 1)) {
      const dow = dayOfWeek(d);
      const slots = saunaFor(d, ctx);
      if (dow === 3 || dow === 5) {
        expect(slots).toEqual([]);
      } else {
        expect(slots).toHaveLength(1);
        expect(slots[0].is_block).toBe(true);
      }
    }
  });

  it('the block overrides rather than stacks with the normal schedule', () => {
    const slots = saunaFor('2027-07-15', ctx);
    expect(slots).toHaveLength(1);
    expect(slots[0].is_block).toBe(true);
  });
});

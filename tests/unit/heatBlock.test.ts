import { describe, it, expect } from 'vitest';
import { heatBlock, inHeatBlock } from '@/domain/heatBlock';
import { addDays, dayOfWeek } from '@/domain/dates';

const RACE = '2027-07-30';

describe('heatBlock — SPEC §7.2', () => {
  it('is a 14-day window ending 3 days before race day', () => {
    expect(heatBlock(RACE)).toEqual({ start: '2027-07-14', end: '2027-07-27' });
  });

  it('is null with no race', () => {
    expect(heatBlock(null)).toBeNull();
  });

  it('inHeatBlock respects inclusive bounds', () => {
    expect(inHeatBlock('2027-07-13', RACE)).toBe(false);
    expect(inHeatBlock('2027-07-14', RACE)).toBe(true); // start
    expect(inHeatBlock('2027-07-27', RACE)).toBe(true); // end
    expect(inHeatBlock('2027-07-28', RACE)).toBe(false);
    expect(inHeatBlock('2027-07-20', null)).toBe(false);
  });

  it('contains exactly 10 sessions — 5/week, resting Wed(3) and Fri(5)', () => {
    let sessions = 0;
    for (let d = '2027-07-14'; d <= '2027-07-27'; d = addDays(d, 1)) {
      const dow = dayOfWeek(d);
      if (dow !== 3 && dow !== 5) sessions++;
    }
    expect(sessions).toBe(10);
  });
});

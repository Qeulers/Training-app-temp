import { describe, it, expect } from 'vitest';
import { parseLocalDate, formatDate, addDays, dayOfWeek, daysBetween } from '@/domain/dates';

describe('date helpers — local-midday anchoring (SPEC §7)', () => {
  it('parses at local midday, not UTC midnight', () => {
    const d = parseLocalDate('2027-07-30');
    expect(d.getHours()).toBe(12);
    expect(d.getFullYear()).toBe(2027);
    expect(d.getMonth()).toBe(6); // July
    expect(d.getDate()).toBe(30);
  });

  it('round-trips through formatDate', () => {
    expect(formatDate(parseLocalDate('2026-01-05'))).toBe('2026-01-05');
    expect(formatDate(parseLocalDate('2027-12-31'))).toBe('2027-12-31');
  });

  it('addDays crosses month and year boundaries', () => {
    expect(addDays('2027-01-31', 1)).toBe('2027-02-01');
    expect(addDays('2027-12-31', 1)).toBe('2028-01-01');
    expect(addDays('2027-03-01', -1)).toBe('2027-02-28');
  });

  it('addDays is DST-safe (spring forward, US + EU)', () => {
    expect(addDays('2027-03-13', 1)).toBe('2027-03-14');
    expect(addDays('2027-03-14', 1)).toBe('2027-03-15');
    expect(addDays('2027-03-27', 1)).toBe('2027-03-28');
  });

  it('dayOfWeek uses 0=Sunday…6=Saturday', () => {
    expect(dayOfWeek('2027-06-06')).toBe(0); // Sunday
    expect(dayOfWeek('2027-06-01')).toBe(2); // Tuesday
    expect(dayOfWeek('2027-07-31')).toBe(6); // Saturday
  });

  it('daysBetween returns signed whole-day difference', () => {
    expect(daysBetween('2027-07-14', '2027-07-27')).toBe(13);
    expect(daysBetween('2027-07-30', '2027-07-30')).toBe(0);
    expect(daysBetween('2027-07-30', '2027-07-28')).toBe(-2);
  });
});

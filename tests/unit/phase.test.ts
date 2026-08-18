import { describe, it, expect } from 'vitest';
import { autoPhase, phase, phaseIsPinned, type PhaseSlug } from '@/domain/phase';

const RACE = '2027-07-30';

describe('autoPhase — SPEC §7.1 known-good vectors', () => {
  const vectors: Array<[string, PhaseSlug]> = [
    ['2027-01-01', 'p1'],
    ['2027-06-01', 'p2'],
    ['2027-07-20', 'p3'],
    ['2027-07-30', 'p3'], // race day
    ['2027-08-05', 'recovery'],
    ['2027-09-15', 'p4'],
  ];
  it.each(vectors)('%s -> %s', (date, expected) => {
    expect(autoPhase(date, RACE)).toBe(expected);
  });

  it('returns p4 for any date when no race is set', () => {
    expect(autoPhase('2027-01-01', null)).toBe('p4');
    expect(autoPhase('2030-12-31', null)).toBe('p4');
  });
});

describe('autoPhase — boundary dates', () => {
  // taperStart = race - 26 = 2027-07-04; p2Start = taperStart - 49 = 2027-05-16
  // recovEnd = race + 14 = 2027-08-13
  it('p2/p3 boundary: taperStart is p3, day before is p2', () => {
    expect(autoPhase('2027-07-04', RACE)).toBe('p3');
    expect(autoPhase('2027-07-03', RACE)).toBe('p2');
  });
  it('p1/p2 boundary: p2Start is p2, day before is p1', () => {
    expect(autoPhase('2027-05-16', RACE)).toBe('p2');
    expect(autoPhase('2027-05-15', RACE)).toBe('p1');
  });
  it('recovery boundary: day after race is recovery, recovEnd is recovery, next day p4', () => {
    expect(autoPhase('2027-07-31', RACE)).toBe('recovery');
    expect(autoPhase('2027-08-13', RACE)).toBe('recovery');
    expect(autoPhase('2027-08-14', RACE)).toBe('p4');
  });

  // DST does not exist in every zone, but local-midday anchoring must keep these
  // dates in the right phase regardless of the runner's timezone.
  it('DST-boundary dates land in the correct phase (spring & autumn)', () => {
    expect(autoPhase('2027-03-14', RACE)).toBe('p1'); // US spring-forward
    expect(autoPhase('2027-03-28', RACE)).toBe('p1'); // EU spring-forward
    expect(autoPhase('2027-11-07', RACE)).toBe('p4'); // US fall-back
  });
});

describe('phase — manual override', () => {
  it('override wins from its `from` date forward', () => {
    const ov = { phase: 'p2' as PhaseSlug, from: '2027-06-15' };
    expect(phase('2027-06-14', RACE, ov)).toBe(autoPhase('2027-06-14', RACE));
    expect(phase('2027-06-15', RACE, ov)).toBe('p2');
    expect(phase('2027-08-05', RACE, ov)).toBe('p2'); // overrides recovery
  });
  it('no override falls back to auto', () => {
    expect(phase('2027-06-01', RACE, null)).toBe('p2');
  });
  it('phaseIsPinned reflects override applicability', () => {
    const ov = { phase: 'p3' as PhaseSlug, from: '2027-06-15' };
    expect(phaseIsPinned('2027-06-14', ov)).toBe(false);
    expect(phaseIsPinned('2027-06-15', ov)).toBe(true);
    expect(phaseIsPinned('2027-06-15', null)).toBe(false);
  });
});

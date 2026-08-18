import { describe, it, expect } from 'vitest';
import { parseHold, type Hold } from '@/domain/prescription';

describe('parseHold — SPEC §7.6', () => {
  const vectors: Array<[string, Hold | null]> = [
    // Spec examples
    ['3×30s', { seconds: 30, perSide: false }],
    ['2×45 sec / side', { seconds: 45, perSide: true }],
    ['3×8 / leg', null], // reps, not a hold
    ['30–45s', { seconds: 30, perSide: false }], // en-dash range -> lower bound
    // Format variants
    ['30-45s', { seconds: 30, perSide: false }], // hyphen range
    ['3×30 sec', { seconds: 30, perSide: false }],
    ['3×30 seconds', { seconds: 30, perSide: false }],
    ['2×1 min / side', { seconds: 60, perSide: true }],
    ['2×1.5 min', { seconds: 90, perSide: false }],
    ['3×45s / leg', { seconds: 45, perSide: true }],
    ['wall sit 60s', { seconds: 60, perSide: false }],
    // Rep-based / no duration -> null, never throw
    ['3×8', null],
    ['3×8 / leg (16→18in)', null],
    ['2×10 / side', null],
    ['AMRAP', null],
    ['', null],
  ];

  it.each(vectors)('%s', (input, expected) => {
    expect(parseHold(input)).toEqual(expected);
  });

  it('never throws on garbage input', () => {
    // @ts-expect-error — defensive: contract is never-throw even off-type.
    expect(() => parseHold(null)).not.toThrow();
    // @ts-expect-error — defensive: contract is never-throw even off-type.
    expect(() => parseHold(undefined)).not.toThrow();
    expect(() => parseHold('🤷 nonsense 🤷')).not.toThrow();
  });
});

import { describe, it, expect } from 'vitest';
// @ts-expect-error — plain ESM validation module, no types needed.
import { validateSeed } from '../../scripts/validate-seed.mjs';
import exercisesJson from '../../data/exercises.json';
import itemsJson from '../../data/session_template_items.json';

/*
 * Data layer (SPEC §10): re-run the §5 seed invariants on every build, plus the
 * specific cases called out as prior bugs.
 */
describe('seed data — SPEC §5 invariants', () => {
  it('passes full validation with zero errors', () => {
    const errors = validateSeed();
    expect(errors).toEqual([]);
  });
});

describe('seed data — regression cases (SPEC §10)', () => {
  const exercises = exercisesJson as Array<{ slug: string; video_url: string }>;
  const items = itemsJson as Array<{ exercise_slug: string }>;

  it('no two exercises share a video URL (side-plank/dead-bug defect)', () => {
    const urls = exercises.map((e) => e.video_url);
    expect(new Set(urls).size).toBe(urls.length);
  });

  it('every session_template_items.exercise_slug resolves to a real exercise', () => {
    const slugs = new Set(exercises.map((e) => e.slug));
    const unresolved = items.filter((i) => !slugs.has(i.exercise_slug));
    expect(unresolved).toEqual([]);
  });
});

/*
 * Seed validation — the invariants from SPEC §5 / README "Validation performed".
 * Exported as `validateSeed(seedDir)` for the Vitest data test, and runnable
 * directly (`node scripts/validate-seed.mjs`) for CI. Returns an array of error
 * strings — empty means valid.
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const HERE = dirname(fileURLToPath(import.meta.url));
export const DEFAULT_SEED_DIR = join(HERE, '..', 'supabase', 'seed');

const load = (dir, name) => JSON.parse(readFileSync(join(dir, `${name}.json`), 'utf8'));

// Accepts the two forms the seed uses: standard watch URLs and Shorts.
const YT_RE = /^https:\/\/www\.youtube\.com\/(watch\?v=|shorts\/)[\w-]{11}$/;

export function validateSeed(seedDir = DEFAULT_SEED_DIR) {
  const errors = [];
  const err = (msg) => errors.push(msg);

  const exercises = load(seedDir, 'exercises');
  const phases = load(seedDir, 'phases');
  const cuisines = load(seedDir, 'cuisines');
  const categories = load(seedDir, 'ingredient_categories');
  const saunaTypes = load(seedDir, 'sauna_types');
  const sessionTemplates = load(seedDir, 'session_templates');
  const sessionItems = load(seedDir, 'session_template_items');
  const saunaSchedule = load(seedDir, 'sauna_schedule');
  const recipes = load(seedDir, 'recipes');
  const ingredients = load(seedDir, 'recipe_ingredients');
  const steps = load(seedDir, 'recipe_steps');

  // Unique slugs / codes
  const uniqueKey = (rows, key, label) => {
    const seen = new Set();
    for (const r of rows) {
      if (seen.has(r[key])) err(`Duplicate ${label} ${key}: ${r[key]}`);
      seen.add(r[key]);
    }
    return seen;
  };
  const exerciseSlugs = uniqueKey(exercises, 'slug', 'exercise');
  const recipeSlugs = uniqueKey(recipes, 'slug', 'recipe');
  const phaseSlugs = uniqueKey(phases, 'slug', 'phase');
  const templateSlugs = uniqueKey(sessionTemplates, 'slug', 'session_template');
  const cuisineCodes = uniqueKey(cuisines, 'code', 'cuisine');
  const categoryCodes = uniqueKey(categories, 'code', 'ingredient_category');
  const saunaTypeSlugs = uniqueKey(saunaTypes, 'slug', 'sauna_type');

  // FK resolution
  const fk = (rows, field, set, label) => {
    for (const r of rows) {
      if (!set.has(r[field])) err(`${label}: unresolved ${field} "${r[field]}"`);
    }
  };
  fk(sessionItems, 'exercise_slug', exerciseSlugs, 'session_template_items');
  fk(sessionItems, 'session_template_slug', templateSlugs, 'session_template_items');
  fk(sessionTemplates, 'phase_slug', phaseSlugs, 'session_templates');
  fk(saunaSchedule, 'phase_slug', phaseSlugs, 'sauna_schedule');
  fk(saunaSchedule, 'sauna_type_slug', saunaTypeSlugs, 'sauna_schedule');
  fk(ingredients, 'recipe_slug', recipeSlugs, 'recipe_ingredients');
  fk(ingredients, 'category_code', categoryCodes, 'recipe_ingredients');
  fk(steps, 'recipe_slug', recipeSlugs, 'recipe_steps');
  fk(recipes, 'cuisine_code', cuisineCodes, 'recipes');

  // Every recipe has >=1 ingredient and >=1 step; step_no contiguous from 1
  const ingByRecipe = new Map();
  for (const i of ingredients) {
    (ingByRecipe.get(i.recipe_slug) ?? ingByRecipe.set(i.recipe_slug, []).get(i.recipe_slug)).push(i);
  }
  const stepsByRecipe = new Map();
  for (const s of steps) {
    (stepsByRecipe.get(s.recipe_slug) ?? stepsByRecipe.set(s.recipe_slug, []).get(s.recipe_slug)).push(s);
  }
  for (const r of recipes) {
    if (!(ingByRecipe.get(r.slug)?.length)) err(`Recipe ${r.slug} has no ingredients`);
    const rs = (stepsByRecipe.get(r.slug) ?? []).map((s) => s.step_no).sort((a, b) => a - b);
    if (!rs.length) err(`Recipe ${r.slug} has no steps`);
    rs.forEach((n, idx) => {
      if (n !== idx + 1) err(`Recipe ${r.slug} step_no not contiguous from 1: got ${n} at position ${idx + 1}`);
    });
  }

  // YouTube URLs well-formed and unique
  const urls = new Set();
  for (const e of exercises) {
    if (!YT_RE.test(e.video_url)) err(`Exercise ${e.slug} has malformed video_url: ${e.video_url}`);
    if (urls.has(e.video_url)) err(`Duplicate video_url across exercises: ${e.video_url}`);
    urls.add(e.video_url);
  }

  // day_of_week within 0-6
  for (const r of [...sessionTemplates, ...saunaSchedule]) {
    if (!(Number.isInteger(r.day_of_week) && r.day_of_week >= 0 && r.day_of_week <= 6)) {
      err(`day_of_week out of range: ${JSON.stringify(r).slice(0, 80)}`);
    }
  }

  return errors;
}

// CLI entry
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const errors = validateSeed();
  if (errors.length) {
    console.error(`✗ Seed validation failed with ${errors.length} error(s):`);
    for (const e of errors) console.error('  - ' + e);
    process.exit(1);
  }
  console.log('✓ Seed data valid (all SPEC §5 invariants hold).');
}

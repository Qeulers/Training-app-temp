/*
 * Swap in better demo videos for exercises.
 *
 * This is the single edit point for changing exercise `video_url`s. Add entries
 * to REPLACEMENTS below (slug -> new YouTube URL), then run:
 *
 *   node scripts/update-exercise-videos.mjs          # validate, sync JSON, write migration
 *   node scripts/update-exercise-videos.mjs --check  # validate only, write nothing
 *
 * On a normal run it:
 *   1. validates every slug exists and every new URL parses to an 11-char
 *      YouTube id (same rule as src/domain/youtube.ts — watch / youtu.be / shorts),
 *   2. rewrites `video_url` in data/exercises.json and supabase/seed/exercises.json
 *      in place (preserving all other fields and order), and
 *   3. generates supabase/migrations/0005_update_exercise_videos.sql — an
 *      idempotent update keyed on slug, touching only the listed exercises.
 *
 * An empty REPLACEMENTS map is a safe no-op. The CURRENT-VIDEOS reference block
 * at the bottom lists every slug and its URL today — copy a line up into
 * REPLACEMENTS and change only the URL.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..');
const DATA_JSON = join(ROOT, 'data', 'exercises.json');
const SEED_JSON = join(ROOT, 'supabase', 'seed', 'exercises.json');
const MIGRATION = join(ROOT, 'supabase', 'migrations', '0005_update_exercise_videos.sql');

// ---------------------------------------------------------------------------
// EDIT HERE: every exercise is listed with its current video, commented out.
// To swap one, uncomment its line and change the URL. Lines left commented are
// ignored, so only the ones you touch get migrated.
// ---------------------------------------------------------------------------
const REPLACEMENTS = {
  'backsquat':      'https://www.youtube.com/watch?v=R2dMsNhN3DE',  // Barbell back squat
  'gobletsquat':    'https://www.youtube.com/watch?v=TzU5zkTEkg8',  // Goblet squat
  'rdl':            'https://www.youtube.com/watch?v=-m45n1_x32E',  // Romanian deadlift
  'bss':            'https://www.youtube.com/watch?v=uqI3GVwfToU',  // Bulgarian split squat
  'stepup':         'https://www.youtube.com/watch?v=9ZknEYboBOQ',  // Weighted step-up
  'packstepup':     'https://www.youtube.com/watch?v=9ZknEYboBOQ',  // Pack step-up (race pack)
  'slrdl':          'https://www.youtube.com/watch?v=_AKa1yvxD_E',  // Single-leg RDL
  'latlunge':       'https://www.youtube.com/watch?v=frdrLD_-VAw',  // Lateral lunge
  'kbswing':        'https://www.youtube.com/watch?v=wMBWFIn4ddg',  // Kettlebell swing
  'calfraise':      'https://www.youtube.com/watch?v=GAZzBJIrmB8',  // Calf raise (slant board)
  'soleusraise':    'https://www.youtube.com/watch?v=wEbwqWirQNw',  // Bent-knee soleus raise
  'tib':            'https://www.youtube.com/watch?v=OPEuhclsTUQ',  // Tibialis raise
  'ankleiso':       'https://www.youtube.com/watch?v=v_zjz5mOvuY',  // Banded ankle circuit
  'farmer':         'https://www.youtube.com/watch?v=3RKKnZhhelE',   // Farmer / suitcase carry
  'suitcasemarch':  'https://www.youtube.com/watch?v=MF73qPp1hlM',  // Suitcase march (in place)
  'frontrackmarch': 'https://www.youtube.com/watch?v=6lE9Q3QUPsQ',  // Suitcase iso-hold
  'stepdown':       'https://www.youtube.com/watch?v=SZXOPRVP1Oc',  // Eccentric box step-down
  'pullup':         'https://www.youtube.com/watch?v=JJp7A277PWw',  // Pull-up
  'dbbench':        'https://www.youtube.com/watch?v=dGqI0Z5ul4k',  // Dumbbell bench press
  'sarow':          'https://www.youtube.com/watch?v=DMo3HJoawrU',  // Single-arm dumbbell row
  'trxrow':         'https://www.youtube.com/watch?v=IEky4NL3LLQ',  // TRX row
  'pushacc':        'https://www.youtube.com/watch?v=jk4MGqOmjn4',  // TRX push-up / dips off bench
  'pallof':         'https://www.youtube.com/watch?v=f_D0GByfZh0',  // Pallof press
};

// --- helpers ---------------------------------------------------------------
// Mirror of youTubeId() in src/domain/youtube.ts — keep in sync.
const youTubeId = (url) => {
  const m = String(url).match(/(?:watch\?v=|shorts\/|youtu\.be\/)([\w-]{11})/);
  return m ? m[1] : null;
};
const q = (s) => "'" + String(s).replace(/'/g, "''") + "'";

function main() {
  const checkOnly = process.argv.includes('--check');
  const entries = Object.entries(REPLACEMENTS);

  const data = JSON.parse(readFileSync(DATA_JSON, 'utf8'));
  const bySlug = new Map(data.map((e) => [e.slug, e]));

  // Validate before touching anything.
  const errors = [];
  for (const [slug, url] of entries) {
    if (!bySlug.has(slug)) errors.push(`unknown slug: ${slug}`);
    if (!youTubeId(url)) errors.push(`unparseable YouTube URL for ${slug}: ${url}`);
  }
  if (errors.length) {
    console.error(`Refusing to run — ${errors.length} error(s):`);
    for (const e of errors) console.error('  - ' + e);
    process.exit(1);
  }

  if (!entries.length) {
    console.log('REPLACEMENTS is empty — nothing to do. Add slug -> URL entries and re-run.');
    return;
  }

  if (checkOnly) {
    console.log(`✓ ${entries.length} replacement(s) valid. (--check: no files written.)`);
    return;
  }

  // 1. Sync both JSON files in place (only video_url changes).
  for (const path of [DATA_JSON, SEED_JSON]) {
    const arr = JSON.parse(readFileSync(path, 'utf8'));
    for (const e of arr) if (e.slug in REPLACEMENTS) e.video_url = REPLACEMENTS[e.slug];
    writeFileSync(path, JSON.stringify(arr, null, 2) + '\n');
  }

  // 2. Emit the migration, in seed order for a stable diff.
  const ordered = data.filter((e) => e.slug in REPLACEMENTS);
  const values = ordered
    .map((e) => `  (${q(e.slug)}, ${q(REPLACEMENTS[e.slug])})`)
    .join(',\n');
  const sql = `-- 0005_update_exercise_videos.sql
-- GENERATED by scripts/update-exercise-videos.mjs — do not edit by hand.
-- Swaps in better demo videos for selected exercises. Idempotent: re-running
-- sets the same video_url values. Only the listed slugs are touched.

update exercises as e set video_url = v.video_url
from (values
${values}
) as v(slug, video_url)
where e.slug = v.slug;
`;
  writeFileSync(MIGRATION, sql);

  console.log(`✓ Updated ${entries.length} video(s):`);
  for (const [slug, url] of entries) console.log(`    ${slug} -> ${url}`);
  console.log(`✓ Synced ${DATA_JSON} and ${SEED_JSON}`);
  console.log(`✓ Wrote ${MIGRATION}`);
  console.log('\nNext: apply the migration (supabase db push / your MCP apply_migration).');
}

main();

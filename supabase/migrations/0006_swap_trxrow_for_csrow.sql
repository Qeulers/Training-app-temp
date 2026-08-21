-- 0006_swap_trxrow_for_csrow.sql
-- Adds the chest-supported dumbbell row (csrow) and swaps it in for the TRX row
-- (trxrow) everywhere it's programmed. The rack-mounted TRX threatens to tip the
-- squat rack unless pulled fully flat, so csrow stands in until that's safe.
-- trxrow stays in the exercise library for when it's re-introduced.
-- Idempotent: the insert upserts on slug; the session-item update matches only
-- rows still pointing at trxrow, so re-running is a no-op.

insert into exercises
  (slug, name, category, video_url, rationale, cues, kit_note, space_note, ramp_note, swap_note, sort_order, rest_seconds)
values
  ('csrow', 'Chest-supported dumbbell row', 'Upper',
   'https://www.youtube.com/watch?v=0-DXJiceG-0',
   'Stand-in for the TRX row while the rack-mounted straps aren''t safe to load — same horizontal pull, chest braced so nothing can tip.',
   '{"Chest flat on the incline bench","Pull dumbbells to your lower ribs","Lower under control, no swing"}'::text[],
   null, null, null,
   'Back to the TRX row once you can load it fully flat without the rack tipping.',
   32, 90)
on conflict (slug) do update set
  name = excluded.name,
  category = excluded.category,
  video_url = excluded.video_url,
  rationale = excluded.rationale,
  cues = excluded.cues,
  swap_note = excluded.swap_note,
  sort_order = excluded.sort_order,
  rest_seconds = excluded.rest_seconds;

update exercises
set swap_note = 'Rack-mounted straps tip unless you go fully flat — using the chest-supported dumbbell row until strong enough to do this flat.'
where slug = 'trxrow';

update session_template_items
set exercise_slug = 'csrow'
where exercise_slug = 'trxrow'
  and session_template_slug in ('p1__upper', 'recovery__easyupper', 'p4__p4pull');

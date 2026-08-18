-- 0002_rls.sql — Row Level Security per SPEC §4.4.
-- RLS is enabled on EVERY table. User tables: owner-only, all verbs.
-- Reference tables: read-only to any authenticated user, writable by no one
-- (no write policies exist, so writes fail even if the client tries).

begin;

-- ============================================================
-- User tables: owner-only across all four verbs.
-- ============================================================
do $$
declare t text;
begin
  foreach t in array array[
    'races','workout_logs','sauna_logs','meal_plan_entries',
    'basket_items','shopping_checks','user_settings'
  ] loop
    execute format('alter table %I enable row level security', t);
    execute format(
      'create policy %I on %I for all using (auth.uid() = user_id) with check (auth.uid() = user_id)',
      'own_rows', t
    );
  end loop;
end $$;

-- user_settings keys on user_id (PK), not a user_id column of the same shape as
-- the others, but the policy above still applies since the column is user_id.

-- workout_log_sets has no user_id; scope through the parent workout_log.
alter table workout_log_sets enable row level security;
create policy "own_sets" on workout_log_sets for all
  using (exists (select 1 from workout_logs l
                 where l.id = workout_log_id and l.user_id = auth.uid()))
  with check (exists (select 1 from workout_logs l
                      where l.id = workout_log_id and l.user_id = auth.uid()));

-- ============================================================
-- Reference tables: SELECT-only to authenticated; no write policies at all.
-- ============================================================
do $$
declare t text;
begin
  foreach t in array array[
    'phases','exercises','session_templates','session_template_items',
    'sauna_types','sauna_schedule','ingredient_categories','cuisines',
    'recipes','recipe_ingredients','recipe_steps','staples','app_content'
  ] loop
    execute format('alter table %I enable row level security', t);
    execute format(
      'create policy %I on %I for select to authenticated using (true)',
      'read_reference', t
    );
  end loop;
end $$;

commit;

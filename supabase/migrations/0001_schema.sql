-- 0001_schema.sql — schema per SPEC §4.2–4.3.
-- Conventions: snake_case, plural tables; reference tables keyed by text slug,
-- user tables by client-generated uuid; day_of_week is 0=Sun..6=Sat.

begin;

-- updated_at maintenance trigger, shared by user tables.
create or replace function set_updated_at()
returns trigger language plpgsql
set search_path = ''   -- security: pin search_path (advisor 0011)
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ============================================================
-- Reference tables (seeded, read-only to the client)
-- ============================================================

create table phases (
  slug          text primary key,
  short_label   text not null,
  name          text not null,
  window_label  text not null,
  goal          text not null,
  notes         text,
  sort_order    int  not null
);

create table exercises (
  slug        text primary key,
  name        text not null,
  category    text not null check (category in ('Lower','Upper','Core','Race','Ankle')),
  video_url   text not null,
  rationale   text,
  cues        text[] not null default '{}',
  kit_note    text,
  space_note  text,
  ramp_note   text,
  swap_note   text,
  sort_order  int not null,
  rest_seconds int not null default 90
);

create table session_templates (
  slug            text primary key,
  phase_slug      text not null references phases(slug),
  session_key     text not null,
  name            text not null,
  day_of_week     int  not null check (day_of_week between 0 and 6),
  duration_label  text not null,
  brief           text,
  sort_order      int  not null,
  unique (phase_slug, session_key)
);

create table session_template_items (
  id                     bigserial primary key,
  session_template_slug  text not null references session_templates(slug) on delete cascade,
  exercise_slug          text not null references exercises(slug),
  prescription           text not null,
  sort_order             int  not null,
  unique (session_template_slug, sort_order)
);

create table sauna_types (
  slug           text primary key,
  name           text not null,
  duration_label text not null,
  temp_label     text not null,
  rationale      text not null,
  how_to         text[] not null default '{}',
  sort_order     int not null
);

create table sauna_schedule (
  id               bigserial primary key,
  phase_slug       text not null references phases(slug),
  slot_key         text not null,
  day_of_week      int  not null check (day_of_week between 0 and 6),
  sauna_type_slug  text not null references sauna_types(slug),
  is_optional      boolean not null default true,
  note             text,
  sort_order       int not null,
  unique (phase_slug, slot_key)
);

create table ingredient_categories (
  code       text primary key,
  label      text not null,
  sort_order int  not null
);

create table cuisines (
  code       text primary key,
  label      text not null,
  sort_order int  not null
);

create table recipes (
  slug         text primary key,
  name         text not null,
  meal_type    text not null check (meal_type in ('breakfast','lunch','dinner','batch')),
  cuisine_code text not null references cuisines(code),
  diet_tag     text not null check (diet_tag in ('veg','fish','chicken')),
  heat_level   int  not null check (heat_level between 0 and 3),
  time_minutes int  not null,
  cost_band    text not null check (cost_band in ('£','££')),
  serves       int  not null,
  description  text,
  spice_note   text,
  tip          text,
  sort_order   int  not null
);

create table recipe_ingredients (
  id              bigserial primary key,
  recipe_slug     text not null references recipes(slug) on delete cascade,
  ingredient_name text not null,
  quantity_text   text not null,
  quantity_value  numeric,
  quantity_unit   text,
  category_code   text not null references ingredient_categories(code),
  sort_order      int  not null,
  unique (recipe_slug, sort_order)   -- required for idempotent seed upserts
);
create index on recipe_ingredients (recipe_slug);

create table recipe_steps (
  id          bigserial primary key,
  recipe_slug text not null references recipes(slug) on delete cascade,
  step_no     int  not null,
  instruction text not null,
  unique (recipe_slug, step_no)
);

create table staples (
  id              bigserial primary key,
  ingredient_name text not null,
  quantity_text   text not null,
  quantity_value  numeric,
  quantity_unit   text,
  category_code   text not null references ingredient_categories(code),
  sort_order      int  not null,
  unique (sort_order)   -- required for idempotent seed upserts
);

create table app_content (
  key   text primary key,
  value jsonb not null
);

-- ============================================================
-- User tables (uuid PK, user_id + RLS, trigger-maintained timestamps)
-- ============================================================

create table races (
  id         uuid primary key,
  user_id    uuid not null references auth.users(id) on delete cascade,
  name       text not null,
  race_date  date not null,
  location   text,
  distance   numeric,
  unit       text check (unit in ('mi','km')) default 'mi',
  is_target  boolean not null default false,
  notes      text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
-- at most one A race per user
create unique index races_one_target on races (user_id) where is_target;
create trigger races_updated_at before update on races
  for each row execute function set_updated_at();

create table workout_logs (
  id            uuid primary key,
  user_id       uuid not null references auth.users(id) on delete cascade,
  logged_on     date not null,
  session_key   text not null,
  session_name  text not null,
  phase_slug    text not null,
  notes         text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index on workout_logs (user_id, logged_on desc);
create trigger workout_logs_updated_at before update on workout_logs
  for each row execute function set_updated_at();

create table workout_log_sets (
  id             uuid primary key,
  workout_log_id uuid not null references workout_logs(id) on delete cascade,
  exercise_slug  text not null references exercises(slug),
  set_no         int  not null,
  weight_kg      numeric not null default 0,
  reps           int     not null default 0,
  unique (workout_log_id, exercise_slug, set_no)
);

create table sauna_logs (
  id               uuid primary key,
  user_id          uuid not null references auth.users(id) on delete cascade,
  logged_on        date not null,
  sauna_type_slug  text not null references sauna_types(slug),
  duration_min     int,
  temp_c           int,
  weight_before_kg numeric,
  weight_after_kg  numeric,
  created_at       timestamptz not null default now()
);
create index on sauna_logs (user_id, logged_on desc);

create table meal_plan_entries (
  id          uuid primary key,
  user_id     uuid not null references auth.users(id) on delete cascade,
  plan_date   date not null,
  recipe_slug text not null references recipes(slug),
  updated_at  timestamptz not null default now(),
  unique (user_id, plan_date)
);
create trigger meal_plan_entries_updated_at before update on meal_plan_entries
  for each row execute function set_updated_at();

create table basket_items (
  id          uuid primary key,
  user_id     uuid not null references auth.users(id) on delete cascade,
  recipe_slug text not null references recipes(slug),
  added_at    timestamptz not null default now(),
  unique (user_id, recipe_slug)
);

-- additive set; presence = ticked. Merge on sync, never overwrite wholesale.
create table shopping_checks (
  id          uuid primary key,
  user_id     uuid not null references auth.users(id) on delete cascade,
  item_key    text not null,
  checked_at  timestamptz not null default now(),
  unique (user_id, item_key)
);

create table user_settings (
  user_id             uuid primary key references auth.users(id) on delete cascade,
  plan_start          date not null default '2026-08-11',
  phase_override      text references phases(slug),
  phase_override_from date,
  theme               text not null default 'system' check (theme in ('system','light','dark')),
  updated_at          timestamptz not null default now()
);
create trigger user_settings_updated_at before update on user_settings
  for each row execute function set_updated_at();

commit;

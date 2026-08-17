# Training &amp; Meal Planner — Implementation Spec

**Target:** port the existing single-file HTML app to a React + Supabase web app.
**Audience:** Claude Code, working in an IDE against this repo.
**Status:** ready to build. Source of truth for behaviour is the current `index.html` (~192 KB, 108 passing jsdom assertions); this document restates that behaviour so the port does not have to reverse-engineer it.

---

## 1. Context

A single user (Frank, 43, ultrarunner) runs 5–6× per week and needs a strength programme that complements rather than competes with running, plus a gout-aware meal planning system shared in practice with his wife. The current app works and is in daily use. This port exists to gain multi-device sync, real auth, and a codebase that can be extended without editing a 4,000-line HTML file.

**This is a port, not a redesign.** Behaviour parity with the current app is the bar for v1. Every domain rule in §7 is already implemented and tested; reimplementing it differently is a regression, not an improvement.

### Decisions already made

| Decision | Choice |
|---|---|
| Frontend | React + Tailwind, TypeScript |
| Backend | Supabase only — Postgres, Auth, RLS. No other backend service |
| Auth | Google OAuth via Supabase Auth |
| Platform | Responsive web app, mobile-first. Not a native app |
| Offline | Offline-first: local cache, background sync on reconnect |
| Reference data | Read-only seed data, changed via SQL migrations |
| Users | Solo. `user_id` + RLS on every user table from day one |
| Theming | Dark and light mode. Tokens TBC |
| Delivery | GitHub PRs only, green CI required |

---

## 2. Goals and non-goals

### Goals

1. **Behaviour parity.** Every feature in §6 works as it does today, verified by the acceptance criteria.
2. **Multi-device.** Log a session on the phone, see it on the iPad.
3. **Offline shopping list.** Full read *and* write with no signal, syncing later. This is the sharpest real-world requirement — supermarkets have bad signal and the list is useless if it needs a connection.
4. **Reference data in migrations.** Adding a recipe is a PR, not a code edit.
5. **Test coverage sufficient to refactor confidently**, since the domain logic is subtle and mostly date arithmetic.

### Non-goals for v1

| Non-goal | Why |
|---|---|
| In-app recipe/exercise editing | Decided: seed data via migrations. Adding CRUD now doubles the schema surface for a workflow used a few times a year |
| Household / multi-user sharing | Solo for now. Mitigated by `user_id` from day one so it is an additive change later |
| Native app or app-store presence | Web app with a PWA install prompt is enough |
| Running plan management | Explicitly out of scope for the whole product — strength, food and sauna only |
| Wearable / Strava / HealthKit integration | No demand yet, large surface |
| Push notifications | Nothing in the app is time-critical to the minute |
| AI features | No current use case that a static plan does not serve better |

---

## 3. Architecture

### 3.1 Shape

```
React (Vite) ──► TanStack Query ──► Supabase JS client ──► Supabase Postgres
       │                 │
       │                 └─► IndexedDB persister (offline cache)
       └─► Outbox (IndexedDB) ──► replay on reconnect
```

**Reference data** (exercises, recipes, phases, sessions, sauna) is immutable at runtime. Fetch once, cache in IndexedDB with a long TTL, invalidate on a `schema_version` value read at boot. It never participates in sync conflicts because the client never writes it.

**User data** (races, logs, meal plans, basket, checks, sauna logs, preferences) is read-write and must work offline.

### 3.2 Offline-first strategy

Use TanStack Query with `persistQueryClient` over IndexedDB for reads, plus an explicit **outbox** for writes. Do not rely on optimistic updates alone — they vanish on refresh, and the shopping-list use case involves closing and reopening the app mid-shop.

**Write path:**
1. Apply the change to the local cache immediately.
2. Append an intent to the outbox: `{id, table, op, payload, client_ts, attempts}`.
3. If online, drain the outbox. If not, drain on `navigator.onLine` / `visibilitychange`.
4. On success, remove the entry. On permanent failure (4xx that is not 401/409), surface a toast and move to a dead-letter list.

**Conflict resolution:** last-write-wins by `updated_at`, with one exception. Shopping-list checkbox state (`shopping_checks`) is an **additive set** — merge rather than overwrite, since ticking items off on the phone should never be clobbered by a stale iPad tab. Model it as rows that are inserted and deleted, not a JSON blob.

**Client-generated IDs.** All user tables use client-generated UUIDs so offline inserts do not need a round trip to get a primary key.

**Required UI states:** an offline indicator, a pending-sync count, and a "last synced" timestamp. Silent divergence is the failure mode to avoid.

### 3.3 Auth

Supabase Auth, Google provider only. Single protected shell; unauthenticated users see a sign-in screen and nothing else. Session persisted in `localStorage`, refreshed by the Supabase client. Because the app is offline-first, an expired token while offline must **not** wipe the local cache or bounce to sign-in — allow read-only access to cached data and queue writes until re-auth.

---

## 4. Data model

### 4.1 Conventions

- `snake_case` tables and columns, plural table names.
- Reference tables use a stable text `slug` primary key (matching the seed JSON) so migrations are readable and diffs are meaningful.
- User tables use `uuid` primary keys, client-generated.
- Every user table carries `user_id uuid not null references auth.users(id) on delete cascade`, plus `created_at`, `updated_at` (trigger-maintained).
- `day_of_week` is an integer, **0 = Sunday … 6 = Saturday**, matching JavaScript `Date.getDay()`. This is load-bearing across the whole app — do not switch to ISO weekday numbering.

### 4.2 Reference tables (seeded, read-only to the client)

```sql
create table phases (
  slug          text primary key,           -- p1, p2, p3, recovery, p4
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
  sort_order  int not null
);

create table session_templates (
  slug            text primary key,          -- '{phase}__{session_key}'
  phase_slug      text not null references phases(slug),
  session_key     text not null,             -- lowerA, upper, race...
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
  prescription           text not null,      -- '3×8 / leg (16→18in)'
  sort_order             int  not null,
  unique (session_template_slug, sort_order)
);

create table sauna_types (
  slug           text primary key,           -- recov, ha, post, strength
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
  code       text primary key,               -- P, V, F, S, D, N
  label      text not null,
  sort_order int  not null
);

create table cuisines (
  code       text primary key,               -- Asian, Mexican, MidEast, Simple
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
  spice_note   text,                         -- "extra chilli on your bowl only"
  tip          text,
  sort_order   int  not null
);

create table recipe_ingredients (
  id              bigserial primary key,
  recipe_slug     text not null references recipes(slug) on delete cascade,
  ingredient_name text not null,
  quantity_text   text not null,             -- '400 g' — authoritative for display
  quantity_value  numeric,                   -- 400 — null for 'to taste'
  quantity_unit   text,                      -- 'g'
  category_code   text not null references ingredient_categories(code),
  sort_order      int  not null
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
  sort_order      int  not null
);

-- singleton content: sauna hydration rules, myth, never-list, heat block config
create table app_content (
  key   text primary key,
  value jsonb not null
);
```

### 4.3 User tables

```sql
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
  id              uuid primary key,
  user_id         uuid not null references auth.users(id) on delete cascade,
  logged_on       date not null,
  sauna_type_slug text not null references sauna_types(slug),
  duration_min    int,
  temp_c          int,
  weight_before_kg numeric,
  weight_after_kg  numeric,
  created_at      timestamptz not null default now()
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
  item_key    text not null,                 -- normalised 'name|category_code'
  checked_at  timestamptz not null default now(),
  unique (user_id, item_key)
);

create table user_settings (
  user_id           uuid primary key references auth.users(id) on delete cascade,
  plan_start        date not null default '2026-08-11',
  phase_override    text references phases(slug),
  phase_override_from date,
  theme             text not null default 'system' check (theme in ('system','light','dark')),
  updated_at        timestamptz not null default now()
);
```

### 4.4 RLS

Enable RLS on **every** table.

```sql
-- user tables: owner-only, all four verbs
alter table races enable row level security;
create policy "own rows" on races for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
-- repeat identically for: workout_logs, sauna_logs, meal_plan_entries,
-- basket_items, shopping_checks, user_settings

-- workout_log_sets has no user_id; scope through the parent
alter table workout_log_sets enable row level security;
create policy "own sets" on workout_log_sets for all
  using (exists (select 1 from workout_logs l
                 where l.id = workout_log_id and l.user_id = auth.uid()))
  with check (exists (select 1 from workout_logs l
                      where l.id = workout_log_id and l.user_id = auth.uid()));

-- reference tables: readable by any authenticated user, writable by no one
alter table exercises enable row level security;
create policy "read reference" on exercises for select to authenticated using (true);
-- repeat for all reference tables. No insert/update/delete policies at all,
-- so writes fail even if the client tries.
```

**Test the negative case.** A test must assert that a second user cannot read user 1's rows, and that an authenticated client cannot write to `exercises`. RLS that is enabled but unproven is not a control.

---

## 5. Seed data

The `seed/` directory holds extracted, validated JSON, one file per table, keys matching column names exactly.

| File | Rows | Notes |
|---|---:|---|
| `exercises.json` | 31 | includes `kit_note`, `space_note`, `ramp_note` |
| `phases.json` | 5 | |
| `session_templates.json` | 11 | |
| `session_template_items.json` | 74 | |
| `sauna_types.json` | 4 | |
| `sauna_schedule.json` | 15 | |
| `sauna_rules.json` | — | → `app_content` rows |
| `ingredient_categories.json` | 6 | |
| `cuisines.json` | 4 | |
| `recipes.json` | 77 | |
| `recipe_ingredients.json` | 617 | 616 quantities parsed; one `to taste` |
| `recipe_steps.json` | 354 | contiguous `step_no` from 1 |
| `staples.json` | 12 | |
| `pluralisation_exceptions.json` | 11 | → `app_content` |

**Validated on extraction:** unique slugs; every FK resolves; every recipe has ≥1 ingredient and ≥1 step; contiguous step numbering; every exercise has a unique, well-formed YouTube URL; `day_of_week` within 0–6.

Load these in a numbered migration (`supabase/migrations/*_seed_reference.sql`) generated from the JSON, so the database is reproducible from the repo alone. Re-run safety: use `insert … on conflict (slug) do update`.

---

## 6. Features

Six top-level tabs: **Today · Calendar · Plan · Moves · Food · Stats**.

### 6.1 Today (P0)

Landing view. Shows the current phase, the countdown to the A race, today's scheduled session, today's sauna slot(s), and daily fuel anchors.

- If a session is scheduled today, offer **Start session**. If already logged, show a completed state instead.
- Sauna slots render one card each, marked *optional* where applicable, with a **Log this sauna** action.
- With no A race set, the countdown reads `—` and the label prompts the user to add a race. **No crashes, no `NaN`, no `undefined`** — this is the cold-start path and it must be clean.

**Workout logger.** Starting a session builds a set-by-set form pre-filled from the most recent log for each exercise (weight and reps), defaulting to 3 sets when there is no history. Sets can be added. On save, only sets that were marked done or have a rep count are persisted.

```
Given a previous log exists for back squat at 3 sets
When the user starts a session containing back squat
Then the form shows 3 sets pre-filled with the previous weights and reps

Given the user completes 2 of 4 displayed sets
When they save
Then only the 2 completed sets are written, and the log appears in Stats
```

### 6.2 Calendar (P0)

Three views over the same data: **week**, **month**, **year**.

- **Week** — seven day cards, Monday-first, each listing races, strength sessions and sauna slots with type, duration, temperature, optional badge and note. Days with nothing scheduled show a "running day" rest state.
- **Month** — 42-cell grid (6 weeks), Monday-first, coloured dots per day for race / strength / sauna, distinct fill for logged. Race days tint green, heat-block days tint red. Tapping a day opens that week.
- **Year** — twelve mini month grids, 3 columns dropping to 2 under 420 px, with a coming-up race list beneath.

Navigation: prev / next stepping by week, month or year respectively, plus **Jump to today**.

```
Given an A race on 2027-07-30
When the user opens the month view for July 2027
Then exactly 42 cells render, the heat-block days are shaded,
     and the race day is marked
```

### 6.3 Plan (P0)

Four sections.

**Races.** Add, delete, and star exactly one race as the **A race**. Fields: name and date (required), location, distance + unit, notes. Starring recalculates every phase boundary, the countdown, the header and the heat block. Listed in date order with a relative countdown per race.

```
Given no races exist
When the user adds a race
Then it automatically becomes the A race

Given an A race exists
When the user adds a second race without ticking "A race"
Then the original A race is unchanged and exactly one target remains
```

**Phase control.** Shows the calculated phase alongside the running phase. The user may pin any phase, which applies from today forward; pinning is reversible with **Clear pin**.

**Sauna.** Session types, the hydration protocol, the never-sauna list, the heat-block window, and quick-log buttons.

**Kit &amp; setup.** Static reference content.

### 6.4 Moves (P0)

Filterable exercise library (All / Lower / Upper / Core / Race / Ankle). Each entry expands to rationale, cues, and where present **Introducing it**, **Kit**, **Space** and **Swap** notes, plus a tap-to-load YouTube embed. Lazy-load the iframe on tap — never eagerly, or 31 embeds will wreck mobile load time.

### 6.5 Food (P0)

One tab, four segments: **Fuel · Recipes · Planner · Shop**.

- **Fuel** — static guidance: gout framework, daily anchors, breakfast/lunch templates.
- **Recipes** — 77 recipes filtered by meal type (breakfast / lunch / dinner / make-ahead) and cuisine. Each shows heat level, time, cost band, serves, ingredients, numbered method, and any spice note or tip. Add to basket from here.
- **Planner** — assign a dinner to each day of the week; auto-suggest fills gaps. **Dinner-only**, regardless of library growth. Sends the week to the shopping list.
- **Shop** — aggregated list grouped by ingredient category, with check-off state. Must work fully offline.

```
Given three recipes in the basket that each need garlic
When the user opens Shop
Then garlic appears once with the combined quantity, under Fresh aromatics & herbs

Given the device is offline
When the user ticks items off the list
Then the ticks persist across an app restart and sync when back online
```

### 6.6 Stats (P1 for charts, P0 for history)

Session history, per-lift personal bests, and a session-tonnage chart over recent sessions. Empty state when nothing is logged.

---

## 7. Domain logic — port exactly

This is the part most likely to be silently broken. Extract into pure, framework-free functions in `src/domain/` and unit-test them directly. **All date handling uses local-midday anchoring** (`new Date(dateStr + 'T12:00:00')`) to sidestep DST and timezone drift; keep that trick.

### 7.1 Phase calculation

```
autoPhase(date, raceDate):
  if no raceDate            -> 'p4'
  taperStart = raceDate - 26 days
  p2Start    = taperStart - 49 days
  recovEnd   = raceDate + 14 days
  if date > raceDate and date <= recovEnd -> 'recovery'
  if date > recovEnd                      -> 'p4'
  if date >= taperStart                   -> 'p3'
  if date >= p2Start                      -> 'p2'
  otherwise                               -> 'p1'

phase(date):
  if override set and date >= override.from -> override.phase
  else autoPhase(date, targetRaceDate)
```

Known-good vectors for an A race of `2027-07-30`:

| Date | Expected |
|---|---|
| 2027-01-01 | `p1` |
| 2027-06-01 | `p2` |
| 2027-07-20 | `p3` |
| 2027-07-30 (race day) | `p3` |
| 2027-08-05 | `recovery` |
| 2027-09-15 | `p4` |
| any date, no race | `p4` |

### 7.2 Heat-acclimation block

```
block.end   = raceDate - 3 days
block.start = block.end - 13 days      (14 days inclusive)
inBlock(d)  = block.start <= d <= block.end
```

For a race on `2027-07-30`: start `2027-07-14`, end `2027-07-27`. Exactly **10 sessions** fall in the block — five per week, resting Wednesday (3) and Friday (5).

### 7.3 Sauna slot resolution

```
saunaFor(date):
  if inHeatBlock(date):
      if dayOfWeek in (3, 5) -> []          # Wed/Fri rest
      else -> [ single 'ha' slot, not optional ]
  else:
      -> sauna_schedule rows where phase = phase(date) and day_of_week matches
```

The heat block **overrides** the normal schedule; it does not stack with it.

### 7.4 Shopping list aggregation

Given the basket (recipe slugs) plus optionally the week's planned dinners, produce one row per distinct `ingredient_name` + `category_code`, summing quantities where units match.

Rules that already exist and must survive the port:
- Combine like units (`400 g` + `200 g` → `600 g`); keep unlike units listed separately (`2 tbsp` + `1 tsp`).
- Handle fractional quantities and compound units.
- Pluralise counted nouns, honouring the exception list in `pluralisation_exceptions.json`.
- Unparseable quantities (`to taste`) pass through as text and never break the sum.
- Group output by `ingredient_categories.sort_order`.

Port the existing algorithm and cover it with **table-driven tests** — this logic has already produced regressions once and it is the most-used feature in the app.

### 7.5 Session scheduling

Strength sessions come from `session_templates` for the current phase, matched on `day_of_week`. Tuesday (2), Thursday (4), Saturday (6) in the standard phases. Sunday (0) is the long run and must stay clear of eccentric work — an automated check should assert no session containing `stepdown` is ever scheduled on day 0.

---

## 8. Design system

**Tokens are TBC**, so define them as CSS custom properties in a single `theme.css`, referenced through Tailwind's `theme.extend`. Never hard-code a hex value in a component — the current app's palette (`--torch`, `--moss`, `--sky`, `--alert`, `--chalk`, `--mist`, `--bog`) should map to semantic names so the values can change without touching components.

Suggested semantic set: `bg`, `surface`, `surface-raised`, `border`, `text`, `text-muted`, `text-dim`, `accent`, `success`, `warning`, `danger`.

**Dark and light mode.** Class strategy (`darkMode: 'class'`), defaulting to `system`, with the override stored in `user_settings.theme` and mirrored to `localStorage` so first paint is correct and does not flash.

**Mobile-first.** Base styles target a phone; scale up. Design constraints inherited from the current app, all worth keeping:
- Max content width 760 px, centred, 16 px gutters.
- Bottom tab bar for the six sections, thumb-reachable.
- Sticky segmented controls inside Food and Calendar.
- Touch targets ≥ 44 px.
- The year view drops from 3 columns to 2 below 420 px.
- No fixed pixel widths above ~380 px anywhere.

**Accessibility:** WCAG AA contrast in both themes, visible focus states, calendar dots never encoding meaning by colour alone — pair with shape, position or a label.

---

## 9. Application structure

```
src/
  domain/          # pure logic, zero React — phases, heat block, sauna,
                   # shopping aggregation, quantity parsing, date helpers
  data/            # supabase client, typed queries, outbox, sync engine
  features/
    today/ calendar/ plan/ moves/ food/ stats/
  components/      # shared primitives
  theme/
supabase/
  migrations/      # schema + seed, numbered, committed
  seed/            # the JSON in this spec
tests/
  unit/ component/ e2e/
```

Generate TypeScript types from the database (`supabase gen types typescript`) and commit them; do not hand-write row types.

Routing: `/today`, `/calendar`, `/plan`, `/moves`, `/food`, `/stats`, with Food segments as query params (`/food?pane=shop`) so the shopping list is directly linkable and survives a refresh mid-shop.

---

## 10. Testing

Non-negotiable, because the domain logic is date arithmetic and the failure mode is silent.

| Layer | Tool | Covers |
|---|---|---|
| Unit | Vitest | All of `src/domain/`. Phase boundaries, heat block, sauna resolution, shopping aggregation, pluralisation, quantity parsing. Use the §7 vectors as fixtures |
| Component | Vitest + React Testing Library | Rendering, empty states, form validation, calendar grids (42 cells, 7 rows, 12 minis) |
| Integration | Vitest + local Supabase | RLS policies including the negative cases; migrations apply cleanly from scratch; seed loads and satisfies referential integrity |
| E2E | Playwright | Sign in, add race, log a session, plan a week, generate a shopping list, tick items **offline**, reconnect and verify sync |
| Data | Vitest | Re-run the seed validation from §5 on every build |

**Specific cases that must be tested** because they have already caused bugs:

- Cold start with no races: no `NaN`, no `undefined`, countdown reads `—`.
- Adding a second race does not steal A-race status.
- Every `session_template_items.exercise_slug` resolves to a real exercise.
- No duplicate video URLs across exercises (this caught a real defect — side plank pointing at the dead-bug video).
- Offline tick → app restart → ticks still present → reconnect → server agrees.
- DST boundary dates land in the correct phase.

CI runs the full suite on every PR. Coverage floor of 90% on `src/domain/`; no floor elsewhere.

---

## 11. Delivery

- `main` protected. No direct pushes.
- Every change via PR with green CI: typecheck, lint, unit, component, integration, e2e, build.
- Migrations reviewed as part of the PR. Never edit an applied migration — add a new one.
- Preview deploy per PR; production deploy on merge.
- Conventional commits, squash merge.

---

## 12. Migration from the current app

One-off importer, run once, then deleted.

1. Export from the running app: a button that dumps all nine `localStorage` keys as a single JSON file.
2. Upload on first sign-in.
3. Map: `fw_races` → `races`; `fw_logs` → `workout_logs` + `workout_log_sets`; `fw_sauna` → `sauna_logs`; `fw_plan` → `meal_plan_entries`; `fw_basket` → `basket_items`; `fw_checks` → `shopping_checks`; `fw_phaseOv` and `fw_planStart` → `user_settings`.
4. Validate every `recipe_slug` and `exercise_slug` against the seed before inserting; report unmatched rather than silently dropping.

Current log shape for reference:

```jsonc
// fw_logs
{ "date": "2026-08-15", "sessionId": "lowerA", "sessionName": "Lower A — Heavy Strength",
  "phase": "p1", "notes": "",
  "entries": { "backsquat": [ { "w": 70, "r": 5 }, { "w": 70, "r": 5 } ] } }
```

---

## 13. Open questions

**Blocking — needed before schema is final**

1. **Design tokens.** Palette and type scale. Everything else can proceed; components should use semantic token names from day one so this lands as a values-only change.

**Non-blocking — decide during implementation**

2. **Sauna log detail.** The schema has `duration_min`, `temp_c`, `weight_before_kg`, `weight_after_kg`, but the current app only records type and date. Given the hydration protocol matters for gout risk, capturing before/after weight would make the app genuinely useful rather than decorative — but it adds friction to a one-tap action. Suggest: keep one-tap logging, with an optional expand for weights.
3. **Basket vs planner overlap.** Today the planner sends the week to the basket, and recipes can also be added directly. Keeping both is fine, but the shopping list should show which source an item came from.
4. **PWA install.** Offline-first implies a service worker anyway; adding a web app manifest is cheap. Worth doing in v1?
5. **Retention.** Workout logs accumulate indefinitely. Fine for years at this volume — no action, noted so it is a decision rather than an oversight.

---

## 14. Phasing

| Phase | Contents |
|---|---|
| **1 — Foundation** | Vite + React + TS + Tailwind, Supabase project, Google auth, schema migrations, seed load, RLS with negative tests, generated types |
| **2 — Domain** | Port `src/domain/` with full unit tests against the §7 vectors. No UI. This is the highest-risk code and should be provably correct before anything renders |
| **3 — Read-only UI** | Six tabs, all reference data rendering: Moves, Recipes, Fuel, Plan's static sections, Calendar reading from seed |
| **4 — User data online** | Races, phase override, workout logger, sauna logging, planner, basket, shopping list. Online-only |
| **5 — Offline** | IndexedDB persistence, outbox, sync engine, conflict handling, offline UI states, e2e offline tests |
| **6 — Polish** | Theming and dark/light, animation, a11y pass, PWA manifest, localStorage importer |

Phase 2 before Phase 3 is deliberate. The domain logic is where correctness actually lives, and it is far easier to test without a UI attached.

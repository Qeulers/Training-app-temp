# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this repo is right now

Two things coexist:

1. **The live app** — [index.html](index.html), a single 2,300-line file: vanilla JS, inline CSS, no build step. This is Frank's daily-use Training & Meal Planner (strength programme + gout-aware meal planning + sauna schedule for an ultrarunner). It runs by opening the file in a browser; there is **no package.json, no toolchain, no tests wired up** in this repo yet.
2. **The port plan** — [SPEC.md](SPEC.md) specifies rebuilding it as React (Vite) + TypeScript + Tailwind + Supabase. **None of that code exists yet.** The `src/`, `supabase/`, `tests/` trees in SPEC §9 are the target, not the current state.

The `*.json` files are seed data **extracted from `index.html`** (one file per target Supabase table). Until the port ships, `index.html` is the source of truth and the JSON is derived from it (see [README.md](README.md) "Regenerating"). After the port goes live, that inverts.

When asked to "work on the app," clarify which: patch the live `index.html`, or build the React port per SPEC.

## Domain logic — the load-bearing part

The value of this app is subtle date arithmetic and shopping-list aggregation. These rules are implemented in `index.html` and restated in **SPEC §7**. Reimplementing them differently is a regression, not an improvement. Port them verbatim into pure functions and table-test them.

- **Local-midday anchoring.** All date parsing uses `new Date(dateStr + 'T12:00:00')` to dodge DST/timezone drift. Keep this trick everywhere.
- **`day_of_week` is `0 = Sunday … 6 = Saturday`** (JS `Date.getDay()`), not ISO. Load-bearing across scheduling and seed data — never renumber.
- **Phase calculation** (SPEC §7.1): `p1 → p2 → p3 → recovery → p4` derived from the target race date, with a manual override. Known-good test vectors are in the spec.
- **Heat-acclimation block** (§7.2): 14-day window ending 3 days before race day; it *overrides* the normal sauna schedule rather than stacking.
- **Shopping-list aggregation** (§7.4): combine like units, keep unlike units separate, pluralise via `pluralisation_exceptions.json`, and pass unparseable quantities (`"to taste"`) through as text without breaking the sum. This feature has regressed before — cover it with table-driven tests.
- **Prescription hold parsing** (§7.6): `parseHold('2×45 sec / side')` → `{seconds:45, perSide:true}`; rep-based prescriptions return `null` and fall back to manual entry. Never throw, never guess a duration.

## Data conventions (seed JSON)

- **Slugs are primary keys** for all reference data, carried over unchanged from the app so existing user data maps cleanly.
- **Foreign keys use `*_slug`** naming (`recipe_slug`, `exercise_slug`, `phase_slug`).
- **`sort_order`** preserves original display order and is not derivable — preserve it.
- **Quantities** carry three fields: `quantity_text` (authoritative display string — always show this), plus parsed `quantity_value` / `quantity_unit` (used *only* for summing in the shopping list; `null` when not parseable).

## Validating the seed data

The seed JSON must satisfy the invariants in [README.md](README.md) "Validation performed" — unique slugs, every FK resolves, every recipe has ≥1 ingredient and ≥1 step, `step_no` contiguous from 1, well-formed unique YouTube URLs per exercise, all `day_of_week` in 0–6. Re-run these as a build-time test after any change to a JSON file or after re-extracting from `index.html`. If you edit `index.html` before the port completes, **re-extract the JSON rather than hand-editing it**, then re-validate.

## Live app internals (index.html)

Only relevant when patching the current app. Structure within the single file:

- Three `<script>` blocks. Data lives as JS consts (`EX`, `RECIPES*`, `STEPS*`, `SESSIONS`, `SAUNA`, `PHASE_META`); the render layer is a set of `render*()` functions dispatched by `renderAll()`.
- **Persistence** is `localStorage` with an in-memory fallback (the `store` object, ~line 521). All keys are prefixed **`fw_`** (`fw_races`, `fw_phaseOv`, `fw_planStart`, …); `store.wipe()` only clears `fw_`-prefixed keys.
- Six tabs (`data-tab`): `today`, `calendar`, `program` (Plan), `exercises` (Moves), `food`, `progress` (Stats), matching SPEC §6.

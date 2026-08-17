# Seed data

Extracted from the single-file app (`index.html`) and validated. One file per target Supabase table; JSON keys match column names exactly, so a loader can map them without translation.

## Files

| File | Rows | Target table |
|---|---:|---|
| `phases.json` | 5 | `phases` |
| `exercises.json` | 31 | `exercises` |
| `session_templates.json` | 11 | `session_templates` |
| `session_template_items.json` | 74 | `session_template_items` |
| `sauna_types.json` | 4 | `sauna_types` |
| `sauna_schedule.json` | 15 | `sauna_schedule` |
| `sauna_rules.json` | — | `app_content` (key `sauna_rules`) |
| `ingredient_categories.json` | 6 | `ingredient_categories` |
| `cuisines.json` | 4 | `cuisines` |
| `recipes.json` | 77 | `recipes` |
| `recipe_ingredients.json` | 617 | `recipe_ingredients` |
| `recipe_steps.json` | 354 | `recipe_steps` |
| `staples.json` | 12 | `staples` |
| `pluralisation_exceptions.json` | 11 | `app_content` (key `pluralisation_exceptions`) |

## Conventions

- **Slugs** are the primary keys for reference data, carried over unchanged from the original app so existing user data (meal plans, logs) maps cleanly.
- **`day_of_week`** is `0 = Sunday … 6 = Saturday`, matching JavaScript `Date.getDay()`. Load-bearing across scheduling — do not renumber.
- **`sort_order`** preserves the original display order. It is not derivable from the data.
- **Foreign keys** use `*_slug` naming (`recipe_slug`, `exercise_slug`, `phase_slug`).

## Quantities

`recipe_ingredients` and `staples` keep three representations:

- `quantity_text` — the authoritative display string (`"400 g"`, `"3 cloves"`, `"to taste"`)
- `quantity_value` — parsed number, `null` when not parseable
- `quantity_unit` — parsed unit, `null` for bare counts

616 of 617 ingredient quantities parse to a number. The single exception is `"to taste"`, which is intentional and must survive aggregation as pass-through text rather than being coerced to zero.

Always display `quantity_text`. Use `quantity_value` / `quantity_unit` only for summing in the shopping list.

## Validation performed

Re-run these as a build-time test:

- Unique slugs across `exercises`, `recipes`, `phases`, `session_templates`
- Every FK resolves: session items → exercises and templates; templates and sauna schedule → phases; sauna schedule → sauna types; ingredients and steps → recipes; ingredients → categories; recipes → cuisines
- Every recipe has at least one ingredient and at least one step
- `step_no` contiguous from 1 within each recipe
- Every exercise has a well-formed YouTube URL, and no two exercises share one
- All `day_of_week` values within 0–6

All currently pass.

## Regenerating

These files are derived from `index.html`. If the HTML app changes before the port completes, re-extract rather than hand-editing — then re-run validation. Once the port is live, the JSON becomes the source of truth and the HTML app is retired.

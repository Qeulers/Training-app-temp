-- 0007: per-user rest-duration overrides for the workout logger.
-- The exercises table carries a shared default rest_seconds (reference data,
-- read-only to clients). This adds a per-user override map so someone can set
-- their own default rest for an exercise from the rest timer. Keyed by exercise
-- slug: { "backsquat": 180, "pallof": 45 }. Existing RLS (own_rows) already
-- scopes user_settings to the owner. Idempotent add so a greenfield rebuild is
-- a no-op.

alter table user_settings
  add column if not exists rest_overrides jsonb not null default '{}'::jsonb;

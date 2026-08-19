-- 0004: per-exercise rest duration for the workout logger rest timer.
-- Adds rest_seconds to exercises and backfills per-exercise values.
-- Idempotent alter so a greenfield rebuild (column already created in 0001) is a no-op here.

alter table exercises add column if not exists rest_seconds int not null default 90;

update exercises as e set rest_seconds = v.rest_seconds
from (values
  ('backsquat', 150),
  ('gobletsquat', 90),
  ('rdl', 150),
  ('bss', 120),
  ('stepup', 120),
  ('packstepup', 120),
  ('slrdl', 90),
  ('latlunge', 90),
  ('kbswing', 90),
  ('calfraise', 45),
  ('soleusraise', 45),
  ('tib', 45),
  ('ankleiso', 45),
  ('farmer', 90),
  ('suitcasemarch', 60),
  ('frontrackmarch', 60),
  ('suitcasehold', 60),
  ('shuttlecarry', 90),
  ('stepdown', 90),
  ('pullup', 120),
  ('ohp', 120),
  ('dbbench', 90),
  ('sarow', 90),
  ('trxrow', 90),
  ('pushacc', 90),
  ('armfinisher', 60),
  ('pallof', 60),
  ('deadbug', 45),
  ('birddog', 45),
  ('sideplank', 45),
  ('hangknee', 60)
) as v(slug, rest_seconds)
where e.slug = v.slug;

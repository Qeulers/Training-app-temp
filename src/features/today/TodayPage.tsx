import { useState } from 'react';
import { TabScaffold } from '@/components/TabScaffold';
import { Card, Eyebrow, Heading, Badge, Button, Chip, QueryBoundary } from '@/components/ui';
import { Icon } from '@/components/Icon';
import {
  usePhases,
  useSessionTemplates,
  useSessionItems,
  useSaunaTypes,
  useSaunaSchedule,
  useExercises,
} from '@/data/reference';
import { useRaces, useUserSettings, useWorkoutLogs, useSaunaLogs } from '@/data/user';
import { formatDate, daysBetween } from '@/domain/dates';
import { phase, type PhaseOverride, type PhaseSlug } from '@/domain/phase';
import { sessionsFor, type SessionTemplate } from '@/domain/schedule';
import { saunaFor } from '@/domain/sauna';
import { WorkoutLogger } from './WorkoutLogger';
import { LogSaunaButton } from './SaunaLog';

export function TodayPage() {
  const today = formatDate(new Date());
  const now = new Date();
  const longDate = now
    .toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' })
    .toUpperCase();

  const phases = usePhases();
  const templates = useSessionTemplates();
  const items = useSessionItems();
  const saunaTypes = useSaunaTypes();
  const saunaSchedule = useSaunaSchedule();
  const exercises = useExercises();
  const races = useRaces();
  const settings = useUserSettings();
  const workoutLogs = useWorkoutLogs();
  const saunaLogs = useSaunaLogs();

  const [logging, setLogging] = useState<SessionTemplate | null>(null);

  return (
    <TabScaffold title="Today" hideTitle>
      <QueryBoundary
        queries={[
          phases,
          templates,
          items,
          saunaTypes,
          saunaSchedule,
          exercises,
          races,
          settings,
          workoutLogs,
          saunaLogs,
        ]}
      >
        {([
          phaseList,
          templateList,
          itemList,
          typeList,
          scheduleList,
          exerciseList,
          raceList,
          userSettings,
          logList,
          saunaLogList,
        ]) => {
          const target = raceList.find((r) => r.is_target) ?? null;
          const raceDate = target?.race_date ?? null;
          const override: PhaseOverride | null =
            userSettings?.phase_override && userSettings.phase_override_from
              ? { phase: userSettings.phase_override as PhaseSlug, from: userSettings.phase_override_from }
              : null;

          const ph = phase(today, raceDate, override);
          const meta = phaseList.find((p) => p.slug === ph);
          const sessions = sessionsFor(today, { raceDate, templates: templateList, override });
          const slots = saunaFor(today, { raceDate, schedule: scheduleList, override });
          const typeBy = new Map(typeList.map((t) => [t.slug, t]));
          const countdown = raceDate ? daysBetween(today, raceDate) : null;

          if (logging) {
            return (
              <WorkoutLogger
                session={logging}
                items={itemList.filter((i) => i.session_template_slug === logging.slug)}
                exercises={exerciseList}
                phaseSlug={ph}
                onClose={() => setLogging(null)}
              />
            );
          }

          return (
            <div className="space-y-6">
              {/* Hero: phase + date + countdown (SPEC §6.1) */}
              <header>
                <div className="flex items-center gap-2">
                  {meta && <Badge tone="accent">{meta.short_label}</Badge>}
                  {meta?.name && (
                    <span className="truncate text-body-sm text-text-muted">{meta.name}</span>
                  )}
                </div>
                <p className="mt-3 font-display text-label font-semibold uppercase tracking-label text-text-dim">
                  {longDate}
                </p>
                <div className="mt-1 flex items-baseline gap-3">
                  <span
                    className="font-body text-display-xl font-bold leading-none text-text"
                    aria-label={countdown === null ? 'no A race set' : `${countdown} days to race`}
                  >
                    {countdown === null ? '—' : countdown < 0 ? '✓' : countdown}
                  </span>
                  <span className="text-body-sm text-text-muted">
                    {countdown === null
                      ? 'no A race set'
                      : countdown < 0
                        ? `${target?.name} is done`
                        : `days to ${target?.name}`}
                  </span>
                </div>
                {!raceDate && (
                  <p className="mt-2 text-meta text-text-dim">
                    Add an A race in Plan to anchor the countdown and phase boundaries.
                  </p>
                )}
              </header>

              {/* Today's strength session */}
              {sessions.length === 0 ? (
                <div>
                  <Eyebrow bullet>Today's strength</Eyebrow>
                  <Card className="mt-1">
                    <p className="text-body-sm text-text-muted">
                      No strength session today — a running or rest day.
                    </p>
                  </Card>
                </div>
              ) : (
                sessions.map((s) => {
                  const doneToday = logList.some(
                    (l) => l.logged_on === today && l.session_key === s.session_key,
                  );
                  const exs = itemList.filter((i) => i.session_template_slug === s.slug);
                  const chips = exs.slice(0, 4);
                  const moreCount = exs.length - chips.length;
                  return (
                    <Card key={s.slug}>
                      <Eyebrow bullet meta={`${s.duration_label} · ${exs.length} moves`}>
                        Today's strength
                      </Eyebrow>
                      <Heading className="mt-2 text-[26px]">{s.name}</Heading>
                      {s.brief && <p className="mt-2 text-body-sm text-text-muted">{s.brief}</p>}
                      <div className="mt-3 flex flex-wrap gap-1.5">
                        {chips.map((i) => {
                          const name =
                            exerciseList.find((e) => e.slug === i.exercise_slug)?.name ??
                            i.exercise_slug;
                          return (
                            <Chip key={i.id}>
                              {name}
                              <span className="ml-1 text-text-dim">{i.prescription}</span>
                            </Chip>
                          );
                        })}
                        {moreCount > 0 && <Chip>+{moreCount} more</Chip>}
                      </div>
                      <div className="mt-4">
                        {doneToday ? (
                          <p className="flex items-center gap-1.5 text-body-sm font-bold text-success">
                            <Icon name="check_circle" size={18} fill /> Logged today
                          </p>
                        ) : (
                          <Button full onClick={() => setLogging(s)}>
                            Start session <Icon name="north_east" size={18} />
                          </Button>
                        )}
                      </div>
                    </Card>
                  );
                })
              )}

              {/* Today's sauna */}
              {slots.length > 0 &&
                slots.map((slot) => {
                  const t = typeBy.get(slot.sauna_type_slug);
                  const doneToday = saunaLogList.some(
                    (l) => l.logged_on === today && l.sauna_type_slug === slot.sauna_type_slug,
                  );
                  return (
                    <Card key={slot.slot_key}>
                      <div className="flex items-start gap-3">
                        <Icon
                          name="local_fire_department"
                          size={26}
                          fill
                          className="mt-0.5 text-warning"
                        />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <Heading>{t?.name}</Heading>
                            {slot.is_optional ? (
                              <Badge tone="warning">optional</Badge>
                            ) : (
                              <Badge tone="accent">planned</Badge>
                            )}
                          </div>
                          {t && (
                            <p className="mt-0.5 text-body-sm text-text-muted">
                              {t.duration_label} · {t.temp_label}
                              {slot.note ? ` · ${slot.note}` : ''}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="mt-3">
                        <LogSaunaButton saunaTypeSlug={slot.sauna_type_slug} done={doneToday} />
                      </div>
                    </Card>
                  );
                })}
            </div>
          );
        }}
      </QueryBoundary>
    </TabScaffold>
  );
}

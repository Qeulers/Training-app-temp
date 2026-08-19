import { useState, useMemo } from 'react';
import { TabScaffold } from '@/components/TabScaffold';
import { Icon } from '@/components/Icon';
import {
  Card,
  Eyebrow,
  Heading,
  Button,
  Badge,
  Segmented,
  QueryBoundary,
} from '@/components/ui';
import {
  usePhases,
  useSessionTemplates,
  useSessionItems,
  useSaunaSchedule,
  useSaunaTypes,
  useExercises,
} from '@/data/reference';
import { useRaces, useUserSettings } from '@/data/user';
import { formatDate, addDays, parseLocalDate, dayOfWeek, daysBetween } from '@/domain/dates';
import { sessionsFor, type SessionTemplate } from '@/domain/schedule';
import { saunaFor } from '@/domain/sauna';
import { WorkoutLogger } from '../today/WorkoutLogger';
import { inHeatBlock, heatBlock } from '@/domain/heatBlock';
import { phase, type PhaseOverride, type PhaseSlug } from '@/domain/phase';
import type { Phase, SessionItem, Exercise, SaunaType } from '@/data/reference';
import type { Tables } from '@/data/database.types';
type Race = Tables<'races'>;

type View = 'week' | 'month' | 'year';

// monCol: Mon=0 … Sun=6 (for Mon-anchored grid)
const monCol = (dateStr: string) => (dayOfWeek(dateStr) + 6) % 7;
const DOW_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

interface Ctx {
  templates: SessionTemplate[];
  schedule: import('@/domain/sauna').SaunaScheduleRow[];
  raceDate: string | null;
  override: PhaseOverride | null;
}

function activityFor(dateStr: string, ctx: Ctx) {
  return {
    sessions: sessionsFor(dateStr, {
      raceDate: ctx.raceDate,
      templates: ctx.templates,
      override: ctx.override,
    }),
    slots: saunaFor(dateStr, {
      raceDate: ctx.raceDate,
      schedule: ctx.schedule,
      override: ctx.override,
    }),
    heat: inHeatBlock(dateStr, ctx.raceDate),
    race: dateStr === ctx.raceDate,
  };
}

// ─── Week helpers ────────────────────────────────────────────────────────────

const weekStart = (anchor: string) => addDays(anchor, -monCol(anchor));

function weekRangeLabel(start: string): string {
  const s = parseLocalDate(start);
  const e = parseLocalDate(addDays(start, 6));
  const sDay = s.getDate();
  const eDay = e.getDate();
  const sMon = s.toLocaleDateString(undefined, { month: 'long' });
  const eMon = e.toLocaleDateString(undefined, { month: 'long' });
  const yr = e.getFullYear();
  if (s.getMonth() === e.getMonth()) {
    return `${sDay} – ${eDay} ${sMon} ${yr}`;
  }
  return `${sDay} ${sMon} – ${eDay} ${eMon} ${yr}`;
}

function weekSubline(
  start: string,
  ctx: Ctx,
  phaseList: Phase[],
): string {
  // Count strength sessions and sauna slots in the week
  let strength = 0;
  let sauna = 0;
  for (let i = 0; i < 7; i++) {
    const d = addDays(start, i);
    const { sessions, slots } = activityFor(d, ctx);
    strength += sessions.length;
    sauna += slots.length;
  }
  // Phase label for the middle of the week
  const mid = addDays(start, 3);
  const ph = phase(mid, ctx.raceDate, ctx.override);
  const meta = phaseList.find((p) => p.slug === ph);
  const phLabel = meta?.short_label ?? ph;

  const parts: string[] = [phLabel];
  if (strength > 0) parts.push(`${strength} strength`);
  if (sauna > 0) parts.push(`${sauna} sauna`);
  return parts.join(' · ');
}

// ─── Month helpers ────────────────────────────────────────────────────────────

function monthCells(anchor: string): string[] {
  const d = parseLocalDate(anchor);
  const firstOfMonth = formatDate(new Date(d.getFullYear(), d.getMonth(), 1));
  const gridStart = addDays(firstOfMonth, -monCol(firstOfMonth));
  return Array.from({ length: 42 }, (_, i) => addDays(gridStart, i));
}

// ─── Page ────────────────────────────────────────────────────────────────────

export function CalendarPage() {
  const [view, setView] = useState<View>('week');
  const [anchor, setAnchor] = useState(formatDate(new Date()));
  const [selectedDay, setSelectedDay] = useState<string>(formatDate(new Date()));
  const [logging, setLogging] = useState<SessionTemplate | null>(null);

  const phases = usePhases();
  const templates = useSessionTemplates();
  const items = useSessionItems();
  const schedule = useSaunaSchedule();
  const saunaTypes = useSaunaTypes();
  const exercises = useExercises();
  const races = useRaces();
  const settings = useUserSettings();

  const step = (dir: number) => {
    setAnchor((a) => addDays(a, dir * (view === 'week' ? 7 : view === 'month' ? 30 : 365)));
  };

  const goToday = () => {
    const today = formatDate(new Date());
    setAnchor(today);
    setSelectedDay(today);
  };

  const VIEW_OPTIONS: { key: View; label: string }[] = [
    { key: 'week', label: 'Week' },
    { key: 'month', label: 'Month' },
    { key: 'year', label: 'Year' },
  ];

  return (
    <TabScaffold title="Calendar" wide hideTitle>
      <QueryBoundary
        queries={[phases, templates, items, schedule, saunaTypes, exercises, races, settings]}
      >
        {([phaseList, templateList, itemList, scheduleList, typeList, exerciseList, raceList, userSettings]) => {
          const target = raceList.find((r) => r.is_target) ?? null;
          const override: PhaseOverride | null =
            userSettings?.phase_override && userSettings.phase_override_from
              ? {
                  phase: userSettings.phase_override as PhaseSlug,
                  from: userSettings.phase_override_from,
                }
              : null;
          const ctx: Ctx = {
            templates: templateList,
            schedule: scheduleList,
            raceDate: target?.race_date ?? null,
            override,
          };
          const typeBy = new Map(typeList.map((t: SaunaType) => [t.slug, t]));
          const exBy = new Map(exerciseList.map((e: Exercise) => [e.slug, e]));

          // Doing a session from another day (e.g. a missed one) — the logger
          // records it as done today (WorkoutLogger uses today's date on save).
          if (logging) {
            return (
              <WorkoutLogger
                session={logging}
                items={itemList.filter((i) => i.session_template_slug === logging.slug)}
                exercises={exerciseList}
                phaseSlug={logging.phase_slug}
                onClose={() => setLogging(null)}
              />
            );
          }

          const wStart = weekStart(anchor);

          // Derive the week title and subline
          const rangeLabel =
            view === 'week'
              ? weekRangeLabel(wStart)
              : view === 'month'
                ? parseLocalDate(anchor).toLocaleDateString(undefined, {
                    month: 'long',
                    year: 'numeric',
                  })
                : String(parseLocalDate(anchor).getFullYear());

          const subline =
            view === 'week' ? weekSubline(wStart, ctx, phaseList) : null;

          return (
            <div className="flex min-h-0 flex-col">
              {/* ── Top bar ── */}
              <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                {/* Left: title + subline */}
                <div className="min-w-0">
                  <h1 className="font-display text-data font-bold leading-tight text-text lg:text-[26px]">
                    {rangeLabel}
                  </h1>
                  {subline && (
                    <p className="mt-0.5 font-display text-label font-semibold uppercase tracking-label text-text-dim">
                      {subline}
                    </p>
                  )}
                </div>

                {/* Right: segmented control + nav */}
                <div className="flex shrink-0 items-center gap-2">
                  <Segmented<View>
                    options={VIEW_OPTIONS}
                    value={view}
                    onChange={setView}
                    ariaLabel="Calendar view"
                  />
                  <div className="flex items-center gap-1">
                    <NavBtn onClick={() => step(-1)} label="Previous week">
                      <Icon name="chevron_left" size={20} />
                    </NavBtn>
                    <button
                      onClick={goToday}
                      className="flex min-h-tap items-center gap-1 rounded-md bg-surface-raised px-3 text-body-sm font-display uppercase tracking-label text-text-muted transition-colors duration-fast ease-brand hover:text-text"
                    >
                      <Icon name="today" size={16} className="text-accent" />
                      Today
                    </button>
                    <NavBtn onClick={() => step(1)} label="Next week">
                      <Icon name="chevron_right" size={20} />
                    </NavBtn>
                  </div>
                </div>
              </div>

              {/* ── View bodies ── */}
              {view === 'week' && (
                <WeekView
                  anchor={anchor}
                  ctx={ctx}
                  typeBy={typeBy}
                  exBy={exBy}
                  itemList={itemList}
                  phaseList={phaseList}
                  selectedDay={selectedDay}
                  onSelectDay={setSelectedDay}
                  onStartSession={setLogging}
                />
              )}
              {view === 'month' && <MonthView anchor={anchor} ctx={ctx} />}
              {view === 'year' && <YearView anchor={anchor} ctx={ctx} raceList={raceList} />}
            </div>
          );
        }}
      </QueryBoundary>
    </TabScaffold>
  );
}

// ─── NavBtn ──────────────────────────────────────────────────────────────────

function NavBtn({
  onClick,
  label,
  children,
}: {
  onClick: () => void;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      aria-label={label}
      className="flex h-tap w-tap items-center justify-center rounded-md bg-surface-raised text-text-muted transition-colors duration-fast ease-brand hover:text-text"
    >
      {children}
    </button>
  );
}

// ─── WeekView ────────────────────────────────────────────────────────────────

interface WeekViewProps {
  anchor: string;
  ctx: Ctx;
  typeBy: Map<string, SaunaType>;
  exBy: Map<string, Exercise>;
  itemList: SessionItem[];
  phaseList: Phase[];
  selectedDay: string;
  onSelectDay: (d: string) => void;
  onStartSession: (s: SessionTemplate) => void;
}

function WeekView({
  anchor,
  ctx,
  typeBy,
  exBy,
  itemList,
  selectedDay,
  onSelectDay,
  onStartSession,
}: WeekViewProps) {
  const start = weekStart(anchor);
  const days = Array.from({ length: 7 }, (_, i) => addDays(start, i));
  const today = formatDate(new Date());

  // Ensure selectedDay is within visible week
  const effectiveSelected = days.includes(selectedDay) ? selectedDay : days[0];

  const selectedActivity = useMemo(
    () => activityFor(effectiveSelected, ctx),
    [effectiveSelected, ctx],
  );

  return (
    // Two-pane at lg+: left=list, right=detail
    <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(0,420px)] lg:gap-4">
      {/* ── Left: day list ── */}
      <div className="space-y-1.5">
        {days.map((d) => {
          const { sessions, slots, heat, race } = activityFor(d, ctx);
          const isToday = d === today;
          const isSelected = d === effectiveSelected;
          const isRunningDay = sessions.length === 0 && slots.length === 0 && !race;

          return (
            <button
              key={d}
              onClick={() => onSelectDay(d)}
              className={[
                'group w-full rounded-lg border text-left transition-colors duration-fast ease-brand',
                isSelected
                  ? 'border-accent bg-surface'
                  : race
                    ? 'border-success/50 bg-surface hover:border-success'
                    : heat
                      ? 'border-danger/30 bg-danger/5 hover:border-danger/50'
                      : 'border-border bg-surface hover:border-border-strong',
              ].join(' ')}
            >
              <div className="flex items-stretch">
                {/* Selected accent bar */}
                <div
                  className={[
                    'w-0.5 flex-none rounded-l-lg transition-colors duration-fast ease-brand',
                    isSelected ? 'bg-accent' : 'bg-transparent',
                  ].join(' ')}
                />

                <div className="flex min-w-0 flex-1 items-start gap-3 px-3 py-3">
                  {/* Date stamp */}
                  <div className="w-12 shrink-0 text-left">
                    <p
                      className={[
                        'font-display text-label font-semibold uppercase tracking-label',
                        isToday ? 'text-accent' : 'text-text-dim',
                      ].join(' ')}
                    >
                      {DOW_LABELS[monCol(d)]}
                    </p>
                    <p
                      className={[
                        'font-display text-data font-bold leading-tight',
                        isToday
                          ? 'text-accent'
                          : isSelected
                            ? 'text-text'
                            : 'text-text-muted',
                      ].join(' ')}
                    >
                      {parseLocalDate(d).getDate()}
                    </p>
                  </div>

                  {/* Activity rows */}
                  <div className="min-w-0 flex-1 space-y-1">
                    {race && (
                      <DayRow
                        shape="circle"
                        color="text-success"
                        bgColor="bg-success"
                        label="Race day"
                        bold
                      />
                    )}
                    {sessions.map((s) => (
                      <DayRow
                        key={s.slug}
                        shape="square"
                        color="text-accent"
                        bgColor="bg-accent"
                        label={s.name}
                        meta={s.duration_label}
                      />
                    ))}
                    {slots.map((slot) => {
                      const t = typeBy.get(slot.sauna_type_slug);
                      return (
                        <DayRow
                          key={slot.slot_key}
                          shape="triangle"
                          color="text-warning"
                          bgColor="bg-warning"
                          label={t?.name ?? 'Sauna'}
                          meta={slot.is_optional ? 'optional' : undefined}
                          dim={slot.is_optional}
                        />
                      );
                    })}
                    {isRunningDay && (
                      <p className="text-body-sm text-text-dim">Running day</p>
                    )}
                  </div>

                  {/* Right badges */}
                  <div className="flex shrink-0 flex-col items-end gap-1">
                    {heat && (
                      <Badge tone="danger">
                        <Icon name="local_fire_department" size={11} fill />
                        heat
                      </Badge>
                    )}
                    {isToday && !isSelected && <Badge tone="accent">today</Badge>}
                  </div>
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/* ── Right: detail pane — stacks below list on mobile, side-by-side at lg+ ── */}
      <div>
        <DayDetail
          dateStr={effectiveSelected}
          activity={selectedActivity}
          ctx={ctx}
          typeBy={typeBy}
          exBy={exBy}
          itemList={itemList}
          onStartSession={onStartSession}
        />
      </div>
    </div>
  );
}

// ─── DayRow (shape + label inside list cells) ─────────────────────────────────

function DayRow({
  shape,
  color,
  bgColor,
  label,
  meta,
  bold = false,
  dim = false,
}: {
  shape: 'circle' | 'square' | 'triangle';
  color: string;
  bgColor: string;
  label: string;
  meta?: string;
  bold?: boolean;
  dim?: boolean;
}) {
  return (
    <div className={`flex items-center gap-2 ${dim ? 'opacity-60' : ''}`}>
      <ActivityShape shape={shape} bgColor={bgColor} size="sm" />
      <span
        className={`truncate text-body-sm ${bold ? 'font-bold text-text' : color}`}
      >
        {label}
      </span>
      {meta && (
        <span className="ml-auto shrink-0 text-meta text-text-dim">{meta}</span>
      )}
    </div>
  );
}

// ─── ActivityShape: ● ■ ▲ for a11y ────────────────────────────────────────────

function ActivityShape({
  shape,
  bgColor,
  size = 'sm',
}: {
  shape: 'circle' | 'square' | 'triangle';
  bgColor: string;
  size?: 'sm' | 'md';
}) {
  const dim = size === 'md' ? 'h-2.5 w-2.5' : 'h-2 w-2';
  if (shape === 'circle') {
    return <i className={`${dim} shrink-0 rounded-full ${bgColor}`} aria-hidden />;
  }
  if (shape === 'square') {
    return <i className={`${dim} shrink-0 rounded-[2px] ${bgColor}`} aria-hidden />;
  }
  // triangle via clip-path
  return (
    <i
      className={`${dim} shrink-0 ${bgColor}`}
      style={{ clipPath: 'polygon(50% 0%, 0% 100%, 100% 100%)' }}
      aria-hidden
    />
  );
}

// ─── DayDetail (right pane / mobile below) ────────────────────────────────────

interface DayDetailProps {
  dateStr: string;
  activity: ReturnType<typeof activityFor>;
  ctx: Ctx;
  typeBy: Map<string, SaunaType>;
  exBy: Map<string, Exercise>;
  itemList: SessionItem[];
  onStartSession: (s: SessionTemplate) => void;
}

function DayDetail({ dateStr, activity, ctx, typeBy, exBy, itemList, onStartSession }: DayDetailProps) {
  const { sessions, slots, heat, race } = activity;
  const today = formatDate(new Date());
  const isToday = dateStr === today;

  const longLabel = parseLocalDate(dateStr)
    .toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'short' })
    .toUpperCase();

  const noActivity = sessions.length === 0 && slots.length === 0 && !race;

  return (
    <div className="space-y-4">
      {/* Eyebrow date + badges */}
      <div>
        <Eyebrow
          tone="muted"
          meta={
            <span className="flex items-center gap-1.5">
              {isToday && <Badge tone="accent">today</Badge>}
              {heat && (
                <Badge tone="danger">
                  <Icon name="local_fire_department" size={11} fill />
                  heat block
                </Badge>
              )}
            </span>
          }
        >
          {longLabel}
        </Eyebrow>
      </div>

      {/* Race day card */}
      {race && (
        <Card className="border-success/50 bg-success/5">
          <div className="flex items-center gap-2">
            <ActivityShape shape="circle" bgColor="bg-success" size="md" />
            <Heading>Race Day</Heading>
          </div>
          {ctx.raceDate && (
            <p className="mt-1 text-body-sm text-text-muted">
              {daysBetween(today, ctx.raceDate) === 0
                ? "It's race day — go!"
                : `${Math.abs(daysBetween(today, ctx.raceDate))} days ${daysBetween(today, ctx.raceDate) > 0 ? 'to go' : 'ago'}`}
            </p>
          )}
        </Card>
      )}

      {/* Strength sessions */}
      {sessions.map((s) => {
        const exs = itemList.filter((i) => i.session_template_slug === s.slug);
        return (
          <Card key={s.slug}>
            <Eyebrow bullet meta={`${s.duration_label} · ${exs.length} moves`}>
              Strength
            </Eyebrow>
            <Heading className="mt-2">{s.name}</Heading>
            {s.brief && (
              <p className="mt-1 text-body-sm text-text-muted">{s.brief}</p>
            )}

            {exs.length > 0 && (
              <ol className="mt-3 space-y-1.5">
                {exs.map((item, idx) => {
                  const ex = exBy.get(item.exercise_slug);
                  return (
                    <li key={item.id} className="flex items-baseline gap-2.5">
                      <span className="w-5 shrink-0 font-display text-label font-semibold text-text-dim">
                        {idx + 1}
                      </span>
                      <span className="flex-1 text-body-sm text-text">
                        {ex?.name ?? item.exercise_slug}
                      </span>
                      <span className="shrink-0 text-meta text-text-dim">
                        {item.prescription}
                      </span>
                    </li>
                  );
                })}
              </ol>
            )}

            <div className="mt-4">
              <Button full onClick={() => onStartSession(s)}>
                Start session <Icon name="play_arrow" size={18} fill />
              </Button>
              {!isToday && (
                <p className="mt-1.5 text-center text-meta text-text-dim">
                  Logs as done today
                </p>
              )}
            </div>
          </Card>
        );
      })}

      {/* Sauna slots */}
      {slots.map((slot) => {
        const t = typeBy.get(slot.sauna_type_slug);
        return (
          <Card key={slot.slot_key}>
            <div className="flex items-start gap-3">
              <Icon
                name="local_fire_department"
                size={24}
                fill
                className="mt-0.5 shrink-0 text-warning"
              />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <Heading>{t?.name ?? 'Sauna'}</Heading>
                  {slot.is_optional ? (
                    <Badge tone="warning">optional</Badge>
                  ) : (
                    <Badge tone="accent">planned</Badge>
                  )}
                  {slot.is_block && <Badge tone="danger">heat block</Badge>}
                </div>
                {t && (
                  <p className="mt-0.5 text-body-sm text-text-muted">
                    {t.duration_label} · {t.temp_label}
                  </p>
                )}
                {slot.note && (
                  <p className="mt-1 text-meta text-text-dim">{slot.note}</p>
                )}
              </div>
            </div>
          </Card>
        );
      })}

      {/* Running / rest day */}
      {noActivity && (
        <Card>
          <p className="text-body-sm text-text-muted">
            Running or rest day — no strength or sauna scheduled.
          </p>
        </Card>
      )}
    </div>
  );
}

// ─── MonthView ────────────────────────────────────────────────────────────────

function MonthView({ anchor, ctx }: { anchor: string; ctx: Ctx }) {
  const cells = monthCells(anchor);
  const month = parseLocalDate(anchor).getMonth();
  const today = formatDate(new Date());
  const hb = heatBlock(ctx.raceDate);

  return (
    <div>
      {/* Legend top-right */}
      <div className="mb-3 flex items-center justify-end gap-4">
        <MonthLegendItem shape="circle" bgColor="bg-success" label="race" />
        <MonthLegendItem shape="square" bgColor="bg-accent" label="strength" />
        <MonthLegendItem shape="triangle" bgColor="bg-warning" label="sauna" />
      </div>

      {/* Weekday headers */}
      <div className="grid grid-cols-7 gap-px">
        {DOW_LABELS.map((l) => (
          <div
            key={l}
            className="py-1 text-center font-display text-label font-semibold uppercase tracking-label text-text-dim"
          >
            {l}
          </div>
        ))}

        {cells.map((d) => {
          const inMonth = parseLocalDate(d).getMonth() === month;
          const isToday = d === today;
          const { sessions, slots, heat, race } = activityFor(d, ctx);

          return (
            <div
              key={d}
              className={[
                'flex aspect-square flex-col items-center justify-between rounded-md border p-1',
                race
                  ? 'border-success/60 bg-success/20 text-text'
                  : heat && inMonth
                    ? 'border-danger/30 bg-danger/10 text-text'
                    : inMonth
                      ? 'border-border bg-surface text-text'
                      : 'border-transparent text-text-dim',
                isToday ? 'ring-1 ring-inset ring-accent' : '',
                !inMonth ? 'opacity-30' : '',
              ].join(' ')}
            >
              <span className="self-start text-meta leading-none">
                {parseLocalDate(d).getDate()}
              </span>
              {/* Shape markers bottom */}
              <span className="flex items-center gap-0.5">
                {race && (
                  <i
                    className="h-1.5 w-1.5 shrink-0 rounded-full bg-success"
                    aria-label="race"
                  />
                )}
                {sessions.length > 0 && (
                  <i
                    className="h-1.5 w-1.5 shrink-0 rounded-[1px] bg-accent"
                    aria-label="strength"
                  />
                )}
                {slots.length > 0 && (
                  <i
                    className="h-1.5 w-1.5 shrink-0 bg-warning"
                    style={{ clipPath: 'polygon(50% 0%, 0% 100%, 100% 100%)' }}
                    aria-label="sauna"
                  />
                )}
              </span>
            </div>
          );
        })}
      </div>

      {/* Heat-block summary bar */}
      {hb && (
        <div className="mt-4 flex items-center gap-2 rounded-lg border border-danger/30 bg-danger/10 px-3 py-2">
          <i
            className="h-2 w-2 shrink-0 rounded-full bg-success"
            aria-label="race marker"
          />
          <p className="text-body-sm text-text-muted">
            Heat block {hb.start} – {hb.end}
            {ctx.raceDate ? ` · Race day ${ctx.raceDate}` : ''}
          </p>
        </div>
      )}
    </div>
  );
}

function MonthLegendItem({
  shape,
  bgColor,
  label,
}: {
  shape: 'circle' | 'square' | 'triangle';
  bgColor: string;
  label: string;
}) {
  return (
    <span className="flex items-center gap-1.5">
      <ActivityShape shape={shape} bgColor={bgColor} size="sm" />
      <span className="font-display text-label uppercase tracking-label text-text-dim">
        {label}
      </span>
    </span>
  );
}

// ─── YearView ────────────────────────────────────────────────────────────────

function YearView({ anchor, ctx, raceList }: { anchor: string; ctx: Ctx; raceList: Race[] }) {
  const year = parseLocalDate(anchor).getFullYear();
  const today = formatDate(new Date());

  const upcoming = raceList
    .filter((r) => r.race_date >= today)
    .sort((a, b) => (a.race_date < b.race_date ? -1 : 1));

  return (
    <div>
      {/* 12 mini-month grids */}
      <div className="grid grid-cols-3 gap-4 narrow:grid-cols-2">
        {Array.from({ length: 12 }, (_, m) => {
          const monthAnchor = formatDate(new Date(year, m, 15));
          const cells = monthCells(monthAnchor);
          const label = parseLocalDate(monthAnchor).toLocaleDateString(undefined, {
            month: 'short',
          });
          // Detect if this month contains a heat block or race
          const hasRace = cells.some(
            (d) => parseLocalDate(d).getMonth() === m && d === ctx.raceDate,
          );

          return (
            <div key={m} className="rounded-lg border border-border bg-surface p-3">
              <p
                className={[
                  'mb-2 font-display text-label font-semibold uppercase tracking-label',
                  hasRace ? 'text-success' : 'text-text-dim',
                ].join(' ')}
              >
                {label}
              </p>
              <div className="grid grid-cols-7 gap-px">
                {cells.map((d) => {
                  const inMonth = parseLocalDate(d).getMonth() === m;
                  const { sessions, slots, heat, race } = activityFor(d, ctx);
                  const active = sessions.length > 0 || slots.length > 0;
                  return (
                    <i
                      key={d}
                      className={[
                        'aspect-square rounded-[1px]',
                        !inMonth
                          ? 'bg-transparent'
                          : race
                            ? 'bg-success'
                            : heat
                              ? 'bg-danger/60'
                              : active
                                ? 'bg-accent/70'
                                : 'bg-surface-raised',
                      ].join(' ')}
                      aria-hidden
                    />
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* Coming up races */}
      {upcoming.length > 0 && (
        <div className="mt-6">
          <p className="mb-2 font-display text-label font-semibold uppercase tracking-label text-text-dim">
            Coming up
          </p>
          <div className="space-y-2">
            {upcoming.map((r) => {
              const daysLeft = daysBetween(today, r.race_date);
              return (
                <div
                  key={r.race_date}
                  className="flex items-center gap-3 rounded-lg border border-border bg-surface px-4 py-3"
                >
                  {r.is_target && (
                    <Icon
                      name="star"
                      size={18}
                      fill
                      className="shrink-0 text-success"
                      label="Target race"
                    />
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-display text-body-sm font-bold text-text">
                      {r.name}
                    </p>
                    <p className="text-meta text-text-dim">
                      {parseLocalDate(r.race_date).toLocaleDateString(undefined, {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      })}
                      {r.distance != null && r.unit
                        ? ` · ${r.distance} ${r.unit}`
                        : r.distance != null
                          ? ` · ${r.distance}`
                          : ''}
                    </p>
                  </div>
                  <span className="shrink-0 font-display text-data font-bold text-text-muted">
                    {daysLeft}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

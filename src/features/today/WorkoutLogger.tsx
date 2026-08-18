import { useEffect, useMemo, useRef, useState } from 'react';
import { Icon } from '@/components/Icon';
import { Eyebrow } from '@/components/ui';
import { parseHold } from '@/domain/prescription';
import { formatDate } from '@/domain/dates';
import { useAllSets, useSaveWorkout, type SetWithDate } from '@/data/user';
import type { SessionItem, Exercise } from '@/data/reference';
import type { SessionTemplate } from '@/domain/schedule';
import { CountdownTimer } from './CountdownTimer';

interface Props {
  session: SessionTemplate;
  items: SessionItem[];
  exercises: Exercise[];
  phaseSlug: string;
  onClose: () => void;
}

interface Row {
  weight: number;
  reps: number;
  done: boolean;
}

/** Most recent logged sets for an exercise, or 3 blank rows (SPEC §6.1). */
function prefill(slug: string, allSets: SetWithDate[]): Row[] {
  const forEx = allSets.filter((s) => s.exercise_slug === slug);
  if (forEx.length) {
    const latest = forEx.reduce((a, b) => (b.logged_on > a.logged_on ? b : a)).logged_on;
    const rows = forEx
      .filter((s) => s.logged_on === latest)
      .sort((a, b) => a.set_no - b.set_no)
      .map((s) => ({ weight: Number(s.weight_kg), reps: s.reps, done: false }));
    if (rows.length) return rows;
  }
  return [0, 1, 2].map(() => ({ weight: 0, reps: 0, done: false }));
}

const REST_DEFAULT = 90;
type Timer = { kind: 'rest'; seconds: number } | { kind: 'hold'; seconds: number; perSide: boolean };

/** Format elapsed seconds as M:SS */
function fmtElapsed(s: number) {
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

export function WorkoutLogger({ session, items, exercises, phaseSlug, onClose }: Props) {
  const allSets = useAllSets();
  const save = useSaveWorkout();
  const nameBy = useMemo(() => new Map(exercises.map((e) => [e.slug, e.name])), [exercises]);
  const exBy = useMemo(() => new Map(exercises.map((e) => [e.slug, e])), [exercises]);

  const [sets, setSets] = useState<Record<string, Row[]>>({});
  const [timer, setTimer] = useState<Timer | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [nextExpanded, setNextExpanded] = useState(false);
  const startRef = useRef(Date.now());

  // Wall-clock elapsed ticker
  useEffect(() => {
    const id = window.setInterval(() => {
      setElapsed(Math.floor((Date.now() - startRef.current) / 1000));
    }, 1000);
    return () => window.clearInterval(id);
  }, []);

  // Initialise once history has loaded.
  const rowsFor = (slug: string): Row[] => sets[slug] ?? prefill(slug, allSets.data ?? []);
  const update = (slug: string, i: number, patch: Partial<Row>) =>
    setSets((prev) => {
      const rows = [...(prev[slug] ?? prefill(slug, allSets.data ?? []))];
      rows[i] = { ...rows[i], ...patch };
      return { ...prev, [slug]: rows };
    });
  const addSet = (slug: string) =>
    setSets((prev) => {
      const rows = prev[slug] ?? prefill(slug, allSets.data ?? []);
      const last = rows[rows.length - 1] ?? { weight: 0, reps: 0 };
      return { ...prev, [slug]: [...rows, { weight: last.weight, reps: 0, done: false }] };
    });

  const onSave = async () => {
    const out = items.flatMap((it) => {
      const rows = rowsFor(it.exercise_slug);
      return rows
        .filter((r) => r.done || r.reps > 0) // persist only completed / repped sets
        .map((r, idx) => ({
          exercise_slug: it.exercise_slug,
          set_no: idx + 1,
          weight_kg: r.weight,
          reps: r.reps,
        }));
    });
    await save.mutateAsync({
      logged_on: formatDate(new Date()),
      session_key: session.session_key,
      session_name: session.name,
      phase_slug: phaseSlug,
      sets: out,
    });
    onClose();
  };

  // Determine which exercise is "current" (first one that isn't fully done)
  const currentIdx = useMemo(() => {
    for (let i = 0; i < items.length; i++) {
      const rows = rowsFor(items[i].exercise_slug);
      if (rows.some((r) => !r.done)) return i;
    }
    return items.length - 1;
    // rowsFor depends on sets; intentional
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sets, items]);

  // Last logged sets for the current exercise, for "LAST TIME" bar
  const lastTimeFor = (slug: string): string | null => {
    if (!allSets.data) return null;
    const forEx = allSets.data.filter((s) => s.exercise_slug === slug);
    if (!forEx.length) return null;
    const latest = forEx.reduce((a, b) => (b.logged_on > a.logged_on ? b : a)).logged_on;
    const rows = forEx
      .filter((s) => s.logged_on === latest)
      .sort((a, b) => a.set_no - b.set_no);
    if (!rows.length) return null;
    const weight = rows[0].weight_kg;
    const repsStr = rows.map((r) => r.reps).join(', ');
    const dateLabel = new Date(latest + 'T12:00:00').toLocaleDateString(undefined, {
      day: 'numeric',
      month: 'short',
    });
    return `${weight} kg × ${repsStr} · ${dateLabel}`;
  };

  return (
    <div className="fixed inset-0 z-30 flex flex-col overflow-hidden bg-bg">
      {/* ── Sticky top bar ── */}
      <div className="z-40 border-b border-border bg-bg/95 backdrop-blur">
        <div className="mx-auto flex max-w-content items-center px-3 py-2">
          {/* Left: ✕ End */}
          <button
            type="button"
            onClick={onClose}
            aria-label="End workout"
            className="flex items-center gap-1 text-text-dim transition-opacity hover:opacity-70"
          >
            <Icon name="close" size={18} />
            <span className="font-body text-body-sm font-bold uppercase tracking-label">End</span>
          </button>

          {/* Center: session name + elapsed */}
          <div className="flex-1 text-center">
            <p className="font-display text-label font-semibold uppercase tracking-label text-text-dim">
              {session.name}&ensp;·&ensp;{fmtElapsed(elapsed)} elapsed
            </p>
          </div>

          {/* Right: Save */}
          <button
            type="button"
            onClick={onSave}
            disabled={save.isPending}
            className="font-body text-body-sm font-bold text-accent transition-opacity hover:opacity-70 disabled:opacity-50"
          >
            {save.isPending ? 'Saving…' : 'Save'}
          </button>
        </div>

        {/* Multi-segment progress bar */}
        {items.length > 0 && (
          <div className="flex h-[3px] w-full gap-px overflow-hidden">
            {items.map((it, i) => {
              const rows = rowsFor(it.exercise_slug);
              const doneCount = rows.filter((r) => r.done).length;
              const total = rows.length;
              const isCompleted = doneCount === total && total > 0;
              const isCurrent = i === currentIdx;
              const progress = isCurrent && total > 0 ? doneCount / total : 0;

              return (
                <div key={it.id} className="relative flex-1 bg-border">
                  <div
                    className="absolute inset-y-0 left-0 bg-accent transition-all duration-base ease-brand"
                    style={{ width: isCompleted ? '100%' : `${progress * 100}%` }}
                  />
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Scrollable body ── */}
      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-content px-4 pb-40 pt-5">
          {allSets.isPending ? (
            <p className="text-body-sm text-text-dim">Loading history…</p>
          ) : (
            <div className="space-y-6">
              {items.map((it, itemIdx) => {
                const rows = rowsFor(it.exercise_slug);
                const hold = parseHold(it.prescription);
                const ex = exBy.get(it.exercise_slug);
                const exName = nameBy.get(it.exercise_slug) ?? it.exercise_slug;
                const lastTime = lastTimeFor(it.exercise_slug);
                const nextItem = items[itemIdx + 1];
                const nextName = nextItem ? (nameBy.get(nextItem.exercise_slug) ?? nextItem.exercise_slug) : null;
                const isActive = itemIdx === currentIdx;

                // Derive a short prescription summary for next row
                const nextPrescription = nextItem?.prescription ?? '';
                // Extract set×rep from prescription like "W1–2: 3×8 mod · then 4×4–6 heavy" → "3×8"
                const nextSummaryMatch = nextPrescription.match(/(\d+×\d+[–-]?\d*)/);
                const nextSummary = nextSummaryMatch ? nextSummaryMatch[1] : nextPrescription.slice(0, 10);

                return (
                  <section key={it.id} aria-label={exName}>
                    {/* Eyebrow + exercise name */}
                    <Eyebrow tone="muted" className="mb-1">
                      Move {itemIdx + 1} of {items.length}
                    </Eyebrow>
                    <h2 className="font-display text-[22px] font-bold leading-tight text-text">
                      {exName}
                    </h2>
                    {/* Green prescription line */}
                    <p className="mt-0.5 font-display text-body-sm font-semibold text-accent">
                      {it.prescription}
                    </p>
                    {/* Coaching / cue */}
                    {ex?.cues && ex.cues.length > 0 && (
                      <p className="mt-1 text-body-sm text-text-dim">{ex.cues[0]}</p>
                    )}

                    {/* Watch demo row */}
                    {ex?.video_url && (
                      <WatchDemoRow
                        videoUrl={ex.video_url}
                        cues={ex.cues ?? []}
                      />
                    )}

                    {/* Set rows */}
                    <div className="mt-3 space-y-2">
                      {rows.map((r, i) => {
                        const isActiveRow = isActive && !r.done && rows.slice(0, i).every((prev) => prev.done);
                        return (
                          <SetRow
                            key={i}
                            index={i}
                            row={r}
                            isActive={isActiveRow}
                            onWeightChange={(v) => update(it.exercise_slug, i, { weight: v })}
                            onRepsChange={(v) => update(it.exercise_slug, i, { reps: v })}
                            onDone={() => {
                              update(it.exercise_slug, i, { done: !r.done });
                              if (!r.done) setTimer({ kind: 'rest', seconds: REST_DEFAULT });
                            }}
                          />
                        );
                      })}
                    </div>

                    {/* + Add set */}
                    <button
                      type="button"
                      onClick={() => addSet(it.exercise_slug)}
                      className="mt-2 flex w-full items-center justify-center gap-1.5 rounded-md border border-dashed border-border py-2.5 text-body-sm font-bold text-text-dim transition-colors hover:border-border-strong hover:text-text-muted"
                    >
                      <Icon name="add" size={16} />
                      Add set
                    </button>

                    {/* Last time info bar */}
                    {lastTime && (
                      <div className="mt-2 rounded-md bg-surface-raised px-3 py-2">
                        <span className="font-display text-label font-semibold uppercase tracking-label text-text-dim">
                          Last time&ensp;
                        </span>
                        <span className="text-body-sm text-text-muted">{lastTime}</span>
                      </div>
                    )}

                    {/* Hold timer trigger (for isometric holds) */}
                    {hold && (
                      <button
                        type="button"
                        onClick={() =>
                          setTimer({ kind: 'hold', seconds: hold.seconds, perSide: hold.perSide })
                        }
                        className="mt-2 flex w-full items-center justify-center gap-1.5 rounded-md border border-border bg-surface py-2.5 text-body-sm font-bold text-text-muted transition-colors hover:text-text"
                      >
                        <Icon name="timer" size={16} />
                        Hold {hold.seconds}s{hold.perSide ? ' / side' : ''}
                      </button>
                    )}

                    {/* NEXT exercise collapsible */}
                    {nextName && itemIdx === currentIdx && (
                      <NextExerciseRow
                        name={nextName}
                        summary={nextSummary}
                        expanded={nextExpanded}
                        onToggle={() => setNextExpanded((v) => !v)}
                      />
                    )}
                  </section>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* ── Sticky bottom bar ── */}
      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-bg/95 backdrop-blur">
        <div className="mx-auto max-w-content">
          {timer && (
            <div className="border-b border-border px-4 py-3">
              <CountdownTimer
                seconds={timer.seconds}
                kind={timer.kind}
                perSide={timer.kind === 'hold' ? timer.perSide : false}
                onClose={() => setTimer(null)}
              />
            </div>
          )}
          <div className="flex items-center justify-between px-4 py-3">
            <p className="text-body-sm text-text-dim">
              {timer ? null : 'Mark a set done to start rest'}
            </p>
            <button
              type="button"
              onClick={() => setTimer({ kind: 'hold', seconds: 30, perSide: false })}
              className="flex items-center gap-1.5 rounded-md border border-border bg-surface px-4 py-2 font-body text-body-sm font-bold text-text transition-colors hover:border-border-strong"
            >
              <Icon name="timer" size={16} />
              Hold timer
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Sub-components ─────────────────────────────────────────────────────── */

/** "Watch demo" + Cues disclosure row */
function WatchDemoRow({ videoUrl, cues }: { videoUrl: string; cues: string[] }) {
  const [cuesOpen, setCuesOpen] = useState(false);
  return (
    <div className="mt-3 rounded-lg border border-border bg-surface">
      <div className="flex items-center gap-3 px-3 py-2.5">
        {/* Green circular play button */}
        <a
          href={videoUrl}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Watch exercise demo"
          className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-accent text-accent-ink transition-opacity hover:opacity-80"
        >
          <Icon name="play_arrow" size={18} fill />
        </a>
        <span className="flex-1 text-body-sm font-bold text-text">Watch demo</span>
        {cues.length > 1 && (
          <button
            type="button"
            onClick={() => setCuesOpen((v) => !v)}
            className="flex items-center gap-0.5 text-body-sm text-text-dim transition-colors hover:text-text"
          >
            Cues
            <Icon name={cuesOpen ? 'expand_less' : 'expand_more'} size={16} />
          </button>
        )}
      </div>
      {cuesOpen && cues.length > 1 && (
        <ul className="space-y-1 border-t border-border px-3 py-2.5">
          {cues.slice(1).map((cue, i) => (
            <li key={i} className="flex gap-2 text-body-sm text-text-dim">
              <span className="mt-1.5 h-1 w-1 flex-shrink-0 rounded-full bg-text-dim" aria-hidden />
              {cue}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/** A single set row: S1 chip, weight input, kg× separator, reps input, check button */
function SetRow({
  index,
  row,
  isActive,
  onWeightChange,
  onRepsChange,
  onDone,
}: {
  index: number;
  row: Row;
  isActive: boolean;
  onWeightChange: (v: number) => void;
  onRepsChange: (v: number) => void;
  onDone: () => void;
}) {
  const label = `S${index + 1}`;
  return (
    <div
      className={[
        'flex items-center gap-2 rounded-lg border p-2 transition-colors duration-fast ease-brand',
        isActive ? 'border-accent' : 'border-border bg-surface',
        row.done ? 'opacity-70' : '',
      ].join(' ')}
    >
      {/* Set label chip */}
      <span className="w-7 flex-shrink-0 text-center font-display text-label font-semibold uppercase tracking-label text-text-dim">
        {label}
      </span>

      {/* Weight input */}
      <input
        type="number"
        inputMode="decimal"
        step={2.5}
        value={row.weight || ''}
        placeholder="—"
        aria-label={`${label} weight in kg`}
        onChange={(e) => onWeightChange(Number(e.target.value) || 0)}
        className="min-h-tap w-[4.5rem] rounded-md border border-border bg-bg px-2 text-center font-body text-body font-bold text-text placeholder:text-text-dim focus:border-accent focus:outline-none"
      />

      {/* Separator */}
      <span className="flex-shrink-0 text-body-sm text-text-dim">kg ×</span>

      {/* Reps input */}
      <input
        type="number"
        inputMode="numeric"
        value={row.reps || ''}
        placeholder="—"
        aria-label={`${label} reps`}
        onChange={(e) => onRepsChange(Number(e.target.value) || 0)}
        className="min-h-tap w-14 rounded-md border border-border bg-bg px-2 text-center font-body text-body font-bold text-text placeholder:text-text-dim focus:border-accent focus:outline-none"
      />

      {/* Spacer */}
      <div className="flex-1" />

      {/* Done check button */}
      <button
        type="button"
        onClick={onDone}
        aria-label={`${label} ${row.done ? 'completed — tap to undo' : 'mark done'}`}
        className={[
          'flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-md transition-colors duration-fast ease-brand',
          row.done
            ? 'bg-accent text-accent-ink'
            : 'border border-border bg-surface text-text-dim hover:border-accent hover:text-accent',
        ].join(' ')}
      >
        <Icon name="check_circle" size={20} fill={row.done} />
      </button>
    </div>
  );
}

/** "NEXT Exercise · prescription" collapsible footer row */
function NextExerciseRow({
  name,
  summary,
  expanded,
  onToggle,
}: {
  name: string;
  summary: string;
  expanded: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className="mt-3 flex w-full items-center gap-2 rounded-lg border border-border bg-surface px-3 py-2.5 text-left transition-colors hover:bg-surface-raised"
    >
      <span className="font-display text-label font-semibold uppercase tracking-label text-text-dim">
        Next
      </span>
      <span className="flex-1 text-body-sm font-bold text-text">
        {name}
        {summary && (
          <span className="ml-2 font-normal text-text-muted">· {summary}</span>
        )}
      </span>
      <Icon
        name={expanded ? 'expand_less' : 'expand_more'}
        size={18}
        className="flex-shrink-0 text-text-dim"
      />
    </button>
  );
}

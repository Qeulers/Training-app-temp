import { useState } from 'react';
import { Icon } from '@/components/Icon';
import { Card, Badge, QueryBoundary } from '@/components/ui';
import {
  usePhases,
  useSessionTemplates,
  useSessionItems,
  useExercises,
  type SessionTemplateRow,
  type SessionItem,
  type Exercise,
} from '@/data/reference';

/** 0 = Sunday … 6 = Saturday (JS Date.getDay(); load-bearing across the app). */
const DOW = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const;

/** A single session, expandable to reveal its exercises. Read-only — no logging. */
function SessionRow({
  session,
  items,
  exBy,
}: {
  session: SessionTemplateRow;
  items: SessionItem[];
  exBy: Map<string, Exercise>;
}) {
  const [open, setOpen] = useState(false);
  const moves = items
    .filter((i) => i.session_template_slug === session.slug)
    .sort((a, b) => a.sort_order - b.sort_order);

  return (
    <Card className={open ? 'border-accent' : ''}>
      <button
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-3 text-left"
      >
        <span className="min-w-0">
          <span className="block truncate font-display text-data font-bold leading-tight text-text">
            {session.name}
          </span>
          <span className="mt-0.5 block font-display text-meta uppercase tracking-label text-text-dim">
            {DOW[session.day_of_week]} · {session.duration_label} · {moves.length} moves
          </span>
        </span>
        <Icon
          name={open ? 'expand_less' : 'expand_more'}
          size={20}
          className="shrink-0 text-text-dim"
        />
      </button>

      {open && (
        <div className="mt-3 border-t border-border pt-3">
          {session.brief && (
            <p className="mb-3 text-body-sm text-text-muted">{session.brief}</p>
          )}
          <ol className="space-y-2.5">
            {moves.map((it, idx) => {
              const ex = exBy.get(it.exercise_slug);
              const name = ex?.name ?? it.exercise_slug;
              return (
                <li key={it.exercise_slug} className="flex gap-3">
                  <span className="mt-0.5 w-5 shrink-0 text-center font-display text-label font-semibold text-text-dim">
                    {idx + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-baseline justify-between gap-x-3">
                      <span className="font-display text-body font-bold text-text">{name}</span>
                      {ex?.video_url && (
                        <a
                          href={ex.video_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-0.5 text-meta text-text-dim transition-colors hover:text-accent"
                        >
                          Demo
                          <Icon name="north_east" size={13} />
                        </a>
                      )}
                    </div>
                    <p className="font-display text-body-sm font-semibold text-accent">
                      {it.prescription}
                    </p>
                    {ex?.cues && ex.cues.length > 0 && (
                      <p className="mt-0.5 text-body-sm text-text-dim">{ex.cues[0]}</p>
                    )}
                  </div>
                </li>
              );
            })}
          </ol>
        </div>
      )}
    </Card>
  );
}

/**
 * Browse every strength session in the programme, grouped by phase, without
 * having to start one. Each session expands to reveal its exercises,
 * prescriptions, first cue, and a demo link.
 */
export function SessionsBrowser() {
  const phases = usePhases();
  const templates = useSessionTemplates();
  const items = useSessionItems();
  const exercises = useExercises();

  return (
    <QueryBoundary queries={[phases, templates, items, exercises]}>
      {([phaseList, templateList, itemList, exerciseList]) => {
        const exBy = new Map(exerciseList.map((e) => [e.slug, e]));
        return (
          <div className="space-y-5">
            {phaseList.map((ph) => {
              const sessions = templateList
                .filter((t) => t.phase_slug === ph.slug)
                .sort((a, b) => a.sort_order - b.sort_order);
              if (sessions.length === 0) return null;
              return (
                <div key={ph.slug} className="space-y-2">
                  <div className="flex items-baseline gap-2">
                    <Badge tone="accent">{ph.short_label}</Badge>
                    <span className="truncate text-body-sm text-text-muted">{ph.name}</span>
                  </div>
                  {sessions.map((s) => (
                    <SessionRow key={s.slug} session={s} items={itemList} exBy={exBy} />
                  ))}
                </div>
              );
            })}
          </div>
        );
      }}
    </QueryBoundary>
  );
}

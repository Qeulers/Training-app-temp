import { useMemo } from 'react';
import { TabScaffold } from '@/components/TabScaffold';
import { Card, Eyebrow, Badge, QueryBoundary } from '@/components/ui';
import { useExercises } from '@/data/reference';
import { useWorkoutLogs, useAllSets } from '@/data/user';
import { parseLocalDate } from '@/domain/dates';

export function StatsPage() {
  const logs = useWorkoutLogs();
  const sets = useAllSets();
  const exercises = useExercises();

  return (
    <TabScaffold title="Stats">
      <QueryBoundary queries={[logs, sets, exercises]}>
        {([logList, setList, exerciseList]) => (
          <StatsInner logs={logList} sets={setList} exercises={exerciseList} />
        )}
      </QueryBoundary>
    </TabScaffold>
  );
}

function StatsInner({
  logs,
  sets,
  exercises,
}: {
  logs: import('@/data/user').WorkoutLog[];
  sets: import('@/data/user').SetWithDate[];
  exercises: import('@/data/reference').Exercise[];
}) {
  const nameBy = useMemo(() => new Map(exercises.map((e) => [e.slug, e.name])), [exercises]);

  const tonnageByLog = useMemo(() => {
    const m = new Map<string, number>();
    for (const s of sets)
      m.set(s.workout_log_id, (m.get(s.workout_log_id) ?? 0) + Number(s.weight_kg) * s.reps);
    return m;
  }, [sets]);

  const bests = useMemo(() => {
    const m = new Map<string, { weight: number; reps: number }>();
    for (const s of sets) {
      const cur = m.get(s.exercise_slug);
      const w = Number(s.weight_kg);
      if (!cur || w > cur.weight) m.set(s.exercise_slug, { weight: w, reps: s.reps });
    }
    return [...m.entries()].filter(([, v]) => v.weight > 0).sort((a, b) => b[1].weight - a[1].weight);
  }, [sets]);

  if (logs.length === 0) {
    return (
      <Card>
        <p className="text-body-sm text-text-muted">
          Nothing logged yet. Your first session writes the first line of the story — session
          history, per-lift bests and weekly tonnage all land here.
        </p>
      </Card>
    );
  }

  const recent = [...logs].sort((a, b) => a.logged_on.localeCompare(b.logged_on)).slice(-10);
  const maxTon = Math.max(1, ...recent.map((l) => tonnageByLog.get(l.id) ?? 0));

  return (
    <div className="space-y-5">
      {/* Tonnage chart */}
      <section>
        <Eyebrow>Session tonnage · last {recent.length}</Eyebrow>
        <Card className="mt-1">
          <div className="flex h-32 items-end gap-1">
            {recent.map((l) => {
              const v = tonnageByLog.get(l.id) ?? 0;
              return (
                <div
                  key={l.id}
                  title={`${v.toLocaleString()} kg · ${l.logged_on}`}
                  className="flex-1 rounded-t-sm bg-accent"
                  style={{ height: `${Math.max(3, (v / maxTon) * 100)}%` }}
                />
              );
            })}
          </div>
          <p className="mt-2 text-meta text-text-dim">
            Total kg per session (weight × reps). Trend matters — expect it to fall in Phases 2–3.
          </p>
        </Card>
      </section>

      {/* Per-lift bests */}
      {bests.length > 0 && (
        <section>
          <Eyebrow>Personal bests</Eyebrow>
          <Card className="mt-1 divide-y divide-border p-0">
            {bests.slice(0, 12).map(([slug, v]) => (
              <div key={slug} className="flex items-center justify-between gap-3 p-3">
                <span className="text-body-sm text-text">{nameBy.get(slug) ?? slug}</span>
                <span className="font-display text-data font-bold text-text">
                  {v.weight} kg <span className="text-meta font-normal text-text-dim">× {v.reps}</span>
                </span>
              </div>
            ))}
          </Card>
        </section>
      )}

      {/* History */}
      <section>
        <Eyebrow>Session history</Eyebrow>
        <div className="mt-1 space-y-2">
          {[...logs].map((l) => (
            <Card key={l.id}>
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="font-display text-data font-bold text-text">{l.session_name}</p>
                  <p className="text-meta text-text-dim">
                    {parseLocalDate(l.logged_on).toLocaleDateString(undefined, {
                      weekday: 'short',
                      day: 'numeric',
                      month: 'short',
                    })}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge>{l.phase_slug}</Badge>
                  <span className="text-body-sm text-text-muted">
                    {(tonnageByLog.get(l.id) ?? 0).toLocaleString()} kg
                  </span>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </section>
    </div>
  );
}

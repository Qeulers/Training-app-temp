import { Card, Badge, QueryBoundary } from '@/components/ui';
import { usePhases } from '@/data/reference';
import { useRaces, useUserSettings, useUpdateSettings } from '@/data/user';
import { formatDate } from '@/domain/dates';
import { autoPhase, phase, type PhaseOverride, type PhaseSlug } from '@/domain/phase';

export function PhaseControl() {
  const phases = usePhases();
  const races = useRaces();
  const settings = useUserSettings();
  const update = useUpdateSettings();
  const today = formatDate(new Date());

  return (
    <QueryBoundary queries={[phases, races, settings]}>
      {([phaseList, raceList, userSettings]) => {
        const raceDate = raceList.find((r) => r.is_target)?.race_date ?? null;
        const override: PhaseOverride | null =
          userSettings?.phase_override && userSettings.phase_override_from
            ? { phase: userSettings.phase_override as PhaseSlug, from: userSettings.phase_override_from }
            : null;

        const calc = autoPhase(today, raceDate);
        const running = phase(today, raceDate, override);
        const pinned = !!override && today >= override.from;
        const nameOf = (slug: string) => phaseList.find((p) => p.slug === slug)?.short_label ?? slug;

        return (
          <Card className="mt-1">
            {/* Calculated vs Running — side by side */}
            <div className="grid grid-cols-2 gap-4 border-b border-border pb-4">
              <div>
                <p className="font-display text-label uppercase tracking-label text-text-dim">
                  Calculated
                </p>
                <p className="mt-0.5 font-display text-data font-bold text-text">{nameOf(calc)}</p>
              </div>
              <div>
                <p className="font-display text-label uppercase tracking-label text-text-dim">
                  Running
                </p>
                <p className="mt-0.5 flex items-center gap-2 font-display text-data font-bold text-accent">
                  {nameOf(running)}
                  {pinned && <Badge tone="warning">pinned</Badge>}
                </p>
              </div>
            </div>

            {/* Pin buttons row */}
            <div className="mt-4 flex flex-wrap items-center gap-2">
              {phaseList.map((p) => (
                <button
                  key={p.slug}
                  onClick={() =>
                    update.mutate({ phase_override: p.slug, phase_override_from: today })
                  }
                  className={[
                    'min-h-tap rounded-full border px-3 py-1 font-display text-body-sm uppercase tracking-label transition-colors duration-fast',
                    running === p.slug && pinned
                      ? 'border-accent bg-accent text-accent-ink'
                      : 'border-border bg-surface text-text-muted hover:border-border-strong hover:text-text',
                  ].join(' ')}
                >
                  {p.short_label}
                </button>
              ))}

              {/* NO PIN button — always visible, dimmed when not pinned */}
              <button
                onClick={() => update.mutate({ phase_override: null, phase_override_from: null })}
                className={[
                  'min-h-tap rounded-full border px-3 py-1 font-display text-body-sm uppercase tracking-label transition-colors duration-fast',
                  !pinned
                    ? 'border-border bg-surface-raised text-text-muted'
                    : 'border-border bg-surface text-text-muted hover:border-border-strong hover:text-text',
                ].join(' ')}
              >
                No pin
              </button>
            </div>

            <p className="mt-3 text-body-sm text-text-muted">
              A pin applies from today forward and is reversible. Starring a different race
              recalculates every boundary.
            </p>
          </Card>
        );
      }}
    </QueryBoundary>
  );
}

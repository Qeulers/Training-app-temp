import { useState } from 'react';
import { Icon } from '@/components/Icon';
import { Card, Button, QueryBoundary } from '@/components/ui';
import { useRaces, useAddRace, useDeleteRace, useStarRace } from '@/data/user';
import { formatDate, daysBetween, parseLocalDate } from '@/domain/dates';

function countdownDays(raceDate: string): number {
  return daysBetween(formatDate(new Date()), raceDate);
}

function countdownText(days: number): string {
  if (days === 0) return 'today';
  if (days < 0) return `${-days}d ago`;
  return `${days}`;
}

function countdownSuffix(days: number): string {
  if (days <= 0) return '';
  return 'days';
}

export function Races() {
  const races = useRaces();
  const del = useDeleteRace();
  const star = useStarRace();
  const [addOpen, setAddOpen] = useState(false);

  return (
    <QueryBoundary queries={[races]}>
      {([list]) => (
        <div className="mt-1">
          {/* Header row with inline "+ Add race" */}
          <div className="mb-2 flex items-center justify-between">
            <span /> {/* spacer — Eyebrow rendered by parent */}
            <button
              onClick={() => setAddOpen(true)}
              className="flex items-center gap-1 text-body-sm text-accent hover:opacity-80"
            >
              <Icon name="add" size={16} className="text-accent" />
              Add race
            </button>
          </div>

          <div className="space-y-2">
            {list.length === 0 && !addOpen && (
              <Card>
                <p className="text-body-sm text-text-muted">
                  No races yet. Add one and the whole plan re-anchors to it. Until then you are
                  training in the general block.
                </p>
              </Card>
            )}

            {list.map((r) => {
              const days = countdownDays(r.race_date);
              return (
                <Card
                  key={r.id}
                  className={r.is_target ? 'border-accent bg-accent/5' : ''}
                >
                  <div className="flex items-center gap-3">
                    {/* Star marker */}
                    <button
                      onClick={() => !r.is_target && star.mutate(r.id)}
                      aria-label={r.is_target ? 'A race' : 'Make A race'}
                      className={[
                        'shrink-0 transition-opacity',
                        r.is_target ? 'cursor-default' : 'hover:opacity-70',
                      ].join(' ')}
                    >
                      <Icon
                        name="star"
                        size={20}
                        fill={r.is_target}
                        className={r.is_target ? 'text-warning' : 'text-text-dim'}
                      />
                    </button>

                    {/* Name + meta */}
                    <div className="min-w-0 flex-1">
                      <h3 className="font-display text-data font-bold text-text leading-tight">
                        {r.name}
                      </h3>
                      <p className="mt-0.5 text-meta text-text-dim">
                        {parseLocalDate(r.race_date).toLocaleDateString(undefined, {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                        })}
                        {r.distance ? ` · ${r.distance} ${r.unit ?? 'mi'}` : ''}
                        {r.location ? ` · ${r.location}` : ''}
                      </p>
                    </div>

                    {/* Countdown + delete */}
                    <div className="flex shrink-0 flex-col items-end gap-1">
                      <div className="text-right">
                        <span
                          className={[
                            'font-display font-bold leading-none',
                            days > 0
                              ? r.is_target
                                ? 'text-[22px] text-accent'
                                : 'text-[22px] text-text'
                              : 'text-data text-text-dim',
                          ].join(' ')}
                        >
                          {countdownText(days)}
                        </span>
                        {days > 0 && (
                          <p className="font-display text-meta uppercase tracking-label text-text-dim">
                            {countdownSuffix(days)}
                          </p>
                        )}
                      </div>
                      <button
                        onClick={() => del.mutate(r.id)}
                        aria-label="Delete race"
                        className="text-meta text-text-dim hover:text-danger"
                      >
                        delete
                      </button>
                    </div>
                  </div>
                </Card>
              );
            })}

            {addOpen && (
              <AddRaceForm hasRaces={list.length > 0} onClose={() => setAddOpen(false)} />
            )}

            {!addOpen && (
              <Button variant="ghost" onClick={() => setAddOpen(true)}>
                + Add race
              </Button>
            )}
          </div>
        </div>
      )}
    </QueryBoundary>
  );
}

function AddRaceForm({ hasRaces, onClose }: { hasRaces: boolean; onClose: () => void }) {
  const add = useAddRace();
  const [f, setF] = useState({
    name: '',
    race_date: '',
    location: '',
    distance: '',
    unit: 'mi' as 'mi' | 'km',
    notes: '',
    asTarget: false,
  });

  const canSubmit = f.name.trim() && f.race_date;

  const submit = async () => {
    if (!canSubmit) return;
    await add.mutateAsync({
      name: f.name.trim(),
      race_date: f.race_date,
      location: f.location.trim() || null,
      distance: f.distance ? Number(f.distance) : null,
      unit: f.unit,
      notes: f.notes.trim() || null,
      asTarget: f.asTarget,
    });
    setF({ name: '', race_date: '', location: '', distance: '', unit: 'mi', notes: '', asTarget: false });
    onClose();
  };

  return (
    <Card>
      <div className="space-y-2 text-body-sm">
        <Input label="Name *" value={f.name} onChange={(v) => setF({ ...f, name: v })} />
        <Input label="Date *" type="date" value={f.race_date} onChange={(v) => setF({ ...f, race_date: v })} />
        <Input label="Location" value={f.location} onChange={(v) => setF({ ...f, location: v })} />
        <div className="flex gap-2">
          <Input label="Distance" type="number" value={f.distance} onChange={(v) => setF({ ...f, distance: v })} />
          <label className="flex flex-col gap-1">
            <span className="font-display text-label uppercase tracking-label text-text-dim">Unit</span>
            <select
              value={f.unit}
              onChange={(e) => setF({ ...f, unit: e.target.value as 'mi' | 'km' })}
              className="min-h-tap rounded-md border border-border bg-surface px-2 text-text"
            >
              <option value="mi">mi</option>
              <option value="km">km</option>
            </select>
          </label>
        </div>
        <Input label="Notes" value={f.notes} onChange={(v) => setF({ ...f, notes: v })} />
        {hasRaces && (
          <label className="flex items-center gap-2 text-text-muted">
            <input
              type="checkbox"
              checked={f.asTarget}
              onChange={(e) => setF({ ...f, asTarget: e.target.checked })}
              className="h-4 w-4 accent-[color:var(--color-accent)]"
            />
            Set as A race
          </label>
        )}
        <div className="flex gap-2 pt-1">
          <Button onClick={submit}>{add.isPending ? 'Adding…' : 'Add race'}</Button>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
        </div>
      </div>
    </Card>
  );
}

function Input({
  label,
  value,
  onChange,
  type = 'text',
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
}) {
  return (
    <label className="flex flex-1 flex-col gap-1">
      <span className="font-display text-label uppercase tracking-label text-text-dim">{label}</span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="min-h-tap rounded-md border border-border bg-surface px-2 text-text"
      />
    </label>
  );
}

import { useState } from 'react';
import { TabScaffold } from '@/components/TabScaffold';
import { Icon } from '@/components/Icon';
import { Card, Heading, Badge, Pill, QueryBoundary } from '@/components/ui';
import { useExercises, type Exercise } from '@/data/reference';
import { youTubeId } from '@/domain/youtube';

const CATEGORIES = ['All', 'Lower', 'Upper', 'Core', 'Race', 'Ankle', 'Mobility'] as const;
type Category = (typeof CATEGORIES)[number];

function ExerciseCard({ ex }: { ex: Exercise }) {
  const [open, setOpen] = useState(false);
  const [playing, setPlaying] = useState(false);
  const id = youTubeId(ex.video_url);

  if (!open) {
    return (
      <Card>
        <button
          onClick={() => setOpen(true)}
          aria-expanded={false}
          className="flex w-full items-center justify-between gap-3 text-left"
        >
          <span className="font-display text-data font-bold leading-tight text-text">
            {ex.name}
          </span>
          <span className="flex items-center gap-2">
            <span className="font-display text-meta uppercase tracking-label text-text-muted">
              {ex.category}
            </span>
            <Icon name="add" size={18} className="text-text-dim" />
          </span>
        </button>
      </Card>
    );
  }

  return (
    <Card className="border-accent">
      {/* Header row */}
      <button
        onClick={() => setOpen(false)}
        aria-expanded={true}
        className="flex w-full items-center justify-between gap-3 text-left"
      >
        <Heading>{ex.name}</Heading>
        <Badge tone="neutral">
          <span className="font-display uppercase tracking-label">{ex.category}</span>
        </Badge>
      </button>

      {/* Description / rationale */}
      {ex.rationale && (
        <p className="mt-2 text-body-sm text-text-muted">{ex.rationale}</p>
      )}

      {/* YouTube placeholder / embed */}
      {id && (
        <div className="mt-3">
          {playing ? (
            <div className="aspect-video overflow-hidden rounded-md">
              <iframe
                className="h-full w-full"
                src={`https://www.youtube-nocookie.com/embed/${id}?autoplay=1`}
                title={ex.name}
                allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>
          ) : (
            <button
              onClick={() => setPlaying(true)}
              className="flex w-full items-center justify-center gap-3 rounded-md border border-dashed border-border bg-surface-raised py-8 hover:opacity-90 transition-opacity duration-fast"
              aria-label={`Play ${ex.name} demo video`}
            >
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-accent">
                <Icon name="play_arrow" size={22} fill className="text-accent-ink" />
              </span>
              <span className="font-mono text-body-sm text-text-dim">
                tap to load YouTube
              </span>
            </button>
          )}
        </div>
      )}

      {/* Coaching cues — green filled-square bullets */}
      {ex.cues.length > 0 && (
        <ul className="mt-3 space-y-1.5">
          {ex.cues.map((c, i) => (
            <li key={i} className="flex items-start gap-2 text-body-sm text-text-muted">
              <span
                aria-hidden
                className="mt-1.5 inline-block h-2 w-2 shrink-0 rounded-[2px] bg-accent"
              />
              <span>{c}</span>
            </li>
          ))}
        </ul>
      )}

      {/* Supplementary notes (ramp / kit / space / swap) */}
      {(
        [
          ['Introducing it', ex.ramp_note],
          ['Kit', ex.kit_note],
          ['Space', ex.space_note],
          ['Swap', ex.swap_note],
        ] as const
      )
        .filter(([, v]) => v)
        .map(([label, v]) => (
          <p key={label} className="mt-2 text-body-sm text-text-muted">
            <span className="font-display uppercase tracking-wide text-text-dim">
              {label}:{' '}
            </span>
            {v}
          </p>
        ))}
    </Card>
  );
}

export function MovesPage() {
  const [cat, setCat] = useState<Category>('All');
  const exercises = useExercises();

  return (
    <TabScaffold title="Moves">
      {/* Filter pill row */}
      <div className="mb-4 flex gap-2 overflow-x-auto pb-1">
        {CATEGORIES.map((c) => (
          <Pill key={c} active={c === cat} onClick={() => setCat(c)}>
            {c}
          </Pill>
        ))}
      </div>

      <QueryBoundary queries={[exercises]}>
        {([list]) => {
          const shown = cat === 'All' ? list : list.filter((e) => e.category === cat);
          return (
            <div className="space-y-2">
              {shown.map((ex) => (
                <ExerciseCard key={ex.slug} ex={ex} />
              ))}
            </div>
          );
        }}
      </QueryBoundary>
    </TabScaffold>
  );
}

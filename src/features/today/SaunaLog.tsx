import { useState } from 'react';
import { Button, Card, Eyebrow, Pill } from '@/components/ui';
import { Icon } from '@/components/Icon';
import { formatDate } from '@/domain/dates';
import { useAddSaunaLog } from '@/data/user';
import type { SaunaType } from '@/data/reference';

/**
 * One-tap sauna logging with an optional expand for before/after weights
 * (SPEC §6.1 / open question 2 — hydration matters for gout, so weights are
 * capturable but never required).
 */
export function LogSaunaButton({ saunaTypeSlug, done }: { saunaTypeSlug: string; done: boolean }) {
  const add = useAddSaunaLog();
  const [open, setOpen] = useState(false);
  const [detail, setDetail] = useState({ duration_min: '', temp_c: '', before: '', after: '' });

  if (done) {
    return <span className="text-body-sm text-success">Logged ✓</span>;
  }

  const num = (v: string) => (v === '' ? null : Number(v));
  const log = (withDetail: boolean) =>
    add.mutate({
      logged_on: formatDate(new Date()),
      sauna_type_slug: saunaTypeSlug,
      duration_min: withDetail ? num(detail.duration_min) : null,
      temp_c: withDetail ? num(detail.temp_c) : null,
      weight_before_kg: withDetail ? num(detail.before) : null,
      weight_after_kg: withDetail ? num(detail.after) : null,
    });

  return (
    <div>
      <div className="flex items-center gap-2">
        <Button onClick={() => log(false)}>{add.isPending ? 'Logging…' : 'Log this sauna'}</Button>
        <Button variant="ghost" onClick={() => setOpen((v) => !v)}>
          {open ? 'Hide' : 'Detail'}
        </Button>
      </div>
      {open && (
        <div className="mt-2 grid grid-cols-2 gap-2 text-meta text-text-dim">
          <Field label="Duration (min)" v={detail.duration_min} on={(x) => setDetail({ ...detail, duration_min: x })} />
          <Field label="Temp (°C)" v={detail.temp_c} on={(x) => setDetail({ ...detail, temp_c: x })} />
          <Field label="Weight before (kg)" v={detail.before} on={(x) => setDetail({ ...detail, before: x })} />
          <Field label="Weight after (kg)" v={detail.after} on={(x) => setDetail({ ...detail, after: x })} />
          <div className="col-span-2">
            <Button full onClick={() => log(true)}>
              Log with detail
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Ad-hoc sauna logging — log any sauna type for today even when nothing is
 * scheduled. Complements the slot-attached LogSaunaButton (SPEC §6.1).
 */
export function AdHocSaunaLog({ types }: { types: SaunaType[] }) {
  const add = useAddSaunaLog();
  const [open, setOpen] = useState(false);
  const [showDetail, setShowDetail] = useState(false);
  const [slug, setSlug] = useState(types[0]?.slug ?? '');
  const [detail, setDetail] = useState({ duration_min: '', temp_c: '', before: '', after: '' });
  const [logged, setLogged] = useState(false);

  const selected = types.find((t) => t.slug === slug);
  const num = (v: string) => (v === '' ? null : Number(v));

  const reset = () => {
    setDetail({ duration_min: '', temp_c: '', before: '', after: '' });
    setShowDetail(false);
    setOpen(false);
  };

  const log = () => {
    if (!slug) return;
    add.mutate(
      {
        logged_on: formatDate(new Date()),
        sauna_type_slug: slug,
        duration_min: showDetail ? num(detail.duration_min) : null,
        temp_c: showDetail ? num(detail.temp_c) : null,
        weight_before_kg: showDetail ? num(detail.before) : null,
        weight_after_kg: showDetail ? num(detail.after) : null,
      },
      {
        onSuccess: () => {
          reset();
          setLogged(true);
        },
      },
    );
  };

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => {
          setOpen(true);
          setLogged(false);
        }}
        className="flex w-full items-center justify-center gap-1.5 rounded-md border border-dashed border-border py-2.5 text-body-sm font-bold text-text-dim transition-colors hover:border-border-strong hover:text-text-muted"
      >
        <Icon name={logged ? 'check_circle' : 'add'} size={16} fill={logged} />
        {logged ? 'Sauna logged — log another' : 'Log a sauna'}
      </button>
    );
  }

  return (
    <Card>
      <div className="flex items-center justify-between">
        <Eyebrow bullet>Log a sauna</Eyebrow>
        <button
          type="button"
          onClick={reset}
          aria-label="Cancel"
          className="text-text-dim transition-opacity hover:opacity-70"
        >
          <Icon name="close" size={18} />
        </button>
      </div>

      {/* Type picker */}
      <div className="mt-3 flex flex-wrap gap-2">
        {types.map((t) => (
          <Pill key={t.slug} active={t.slug === slug} onClick={() => setSlug(t.slug)}>
            {t.name}
          </Pill>
        ))}
      </div>
      {selected && (
        <p className="mt-2 text-body-sm text-text-muted">
          {selected.duration_label} · {selected.temp_label}
        </p>
      )}

      {/* Optional detail */}
      <button
        type="button"
        onClick={() => setShowDetail((v) => !v)}
        className="mt-3 flex items-center gap-0.5 text-body-sm text-text-dim transition-colors hover:text-text"
      >
        {showDetail ? 'Hide detail' : 'Add detail'}
        <Icon name={showDetail ? 'expand_less' : 'expand_more'} size={16} />
      </button>
      {showDetail && (
        <div className="mt-2 grid grid-cols-2 gap-2 text-meta text-text-dim">
          <Field label="Duration (min)" v={detail.duration_min} on={(x) => setDetail({ ...detail, duration_min: x })} />
          <Field label="Temp (°C)" v={detail.temp_c} on={(x) => setDetail({ ...detail, temp_c: x })} />
          <Field label="Weight before (kg)" v={detail.before} on={(x) => setDetail({ ...detail, before: x })} />
          <Field label="Weight after (kg)" v={detail.after} on={(x) => setDetail({ ...detail, after: x })} />
        </div>
      )}

      <div className="mt-3">
        <Button full onClick={log} disabled={add.isPending || !slug}>
          {add.isPending ? 'Logging…' : 'Log sauna'}
        </Button>
      </div>
    </Card>
  );
}

function Field({ label, v, on }: { label: string; v: string; on: (x: string) => void }) {
  return (
    <label className="flex flex-col gap-1">
      {label}
      <input
        type="number"
        inputMode="decimal"
        value={v}
        onChange={(e) => on(e.target.value)}
        className="min-h-tap rounded-md border border-border bg-surface px-2 text-text"
      />
    </label>
  );
}

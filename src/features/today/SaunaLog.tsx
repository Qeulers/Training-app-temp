import { useState } from 'react';
import { Button } from '@/components/ui';
import { formatDate } from '@/domain/dates';
import { useAddSaunaLog } from '@/data/user';

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

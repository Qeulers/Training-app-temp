import { TabScaffold } from '@/components/TabScaffold';
import { Icon } from '@/components/Icon';
import { Card, Eyebrow, QueryBoundary } from '@/components/ui';
import { useSaunaTypes, useAppContent } from '@/data/reference';
import { useRaces } from '@/data/user';
import { heatBlock } from '@/domain/heatBlock';
import { parseLocalDate, formatDate } from '@/domain/dates';
import { Races } from './Races';
import { PhaseControl } from './PhaseControl';
import { SessionsBrowser } from './SessionsBrowser';

interface SaunaRules {
  hydration: string;
  myth: string;
  never: string[];
  heat_block: {
    length_days: number;
    ends_days_before_race: number;
    sessions_per_week: number;
    rest_days_of_week: number[];
  };
}

const KIT = [
  ['5 m of clear floor', 'Clear a hallway or driveway edge and the shuttle carry comes back on the menu — walking carries beat static holds for trunk activation.'],
  ['Heavier single bell (20–24 kg)', 'The priority buy. Marches and iso-holds need more load than distance carries did.'],
  ['Digital scale by the sauna', 'Weigh in and out of every session. A hydration instrument, not a vanity one.'],
  ['Electrolyte tabs', 'Plain water after heavy sweating is not enough given your urate sensitivity.'],
  ['Extra barbell plates', 'Squat and RDL pass 60 kg inside the first block.'],
  ['Slant board (optional)', 'Cheap; good for soleus and controlled ankle work given your history.'],
] as const;

function formatShortDate(dateStr: string): string {
  return parseLocalDate(dateStr).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
}

function SaunaPane() {
  const saunaTypes = useSaunaTypes();
  const rules = useAppContent<SaunaRules>('sauna_rules');
  const races = useRaces();

  return (
    <QueryBoundary queries={[saunaTypes, rules, races]}>
      {([types, r, raceList]) => {
        const raceDate = raceList.find((race) => race.is_target)?.race_date ?? null;
        const block = heatBlock(raceDate);
        const today = formatDate(new Date());
        const blockActive = block ? today >= block.start && today <= block.end : false;

        // Count sessions: 10 per the design constant from the rules
        const sessionCount = r ? r.heat_block.sessions_per_week * 2 : 10;

        return (
          <div className="space-y-3">
            {/* Heat block banner — only shown when a race is set */}
            {block && (
              <div
                className={[
                  'rounded-lg border p-4',
                  blockActive
                    ? 'border-danger bg-danger/10'
                    : 'border-danger/40 bg-surface',
                ].join(' ')}
              >
                <div className="flex items-center gap-2">
                  <Icon name="local_fire_department" size={18} fill className="text-danger" />
                  <span className="font-display text-label font-semibold uppercase tracking-label text-danger">
                    Heat block
                  </span>
                </div>
                <p className="mt-1 font-display text-data font-bold text-text">
                  {formatShortDate(block.start)} – {formatShortDate(block.end)} · {sessionCount} sessions
                </p>
                <p className="mt-1 text-body-sm text-text-muted">
                  Overrides the normal schedule. Rest Wed &amp; Fri. Weigh in and out of every
                  session.
                </p>
              </div>
            )}

            {/* Sauna types */}
            <div className="space-y-2">
              {types.map((t) => (
                <Card key={t.slug}>
                  <div className="flex items-start gap-3">
                    <Icon
                      name="local_fire_department"
                      size={20}
                      fill
                      className="mt-0.5 shrink-0 text-warning"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5">
                        <h3 className="font-display text-data font-bold text-text">{t.name}</h3>
                        <span className="font-display text-meta text-text-dim">
                          {t.duration_label} · {t.temp_label}
                        </span>
                      </div>
                      <p className="mt-0.5 text-body-sm text-text-muted">{t.rationale}</p>
                    </div>
                  </div>
                </Card>
              ))}
            </div>

            {/* Never sauna rules */}
            {r && r.never.length > 0 && (
              <Card>
                <Eyebrow tone="muted">Never sauna</Eyebrow>
                <ul className="mt-2 space-y-1.5">
                  {r.never.map((n, i) => (
                    <li key={i} className="flex items-start gap-2 text-body-sm text-text-muted">
                      <Icon
                        name="close"
                        size={16}
                        className="mt-px shrink-0 text-danger"
                        label=""
                      />
                      <span>{n}</span>
                    </li>
                  ))}
                </ul>
              </Card>
            )}

            {/* Hydration note */}
            {r && (
              <Card>
                <Eyebrow tone="muted">Hydration</Eyebrow>
                <p className="mt-1 text-body-sm text-text-muted">{r.hydration}</p>
                <p className="mt-2 text-body-sm text-text-dim">{r.myth}</p>
              </Card>
            )}
          </div>
        );
      }}
    </QueryBoundary>
  );
}

export function PlanPage() {
  return (
    <TabScaffold title="Plan" wide>
      {/* Two-pane layout: left = Races + Phase, right = Sauna. Stacks on mobile. */}
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,380px)]">
        {/* LEFT PANE */}
        <div className="space-y-6">
          <section>
            <Eyebrow>Races</Eyebrow>
            <Races />
          </section>

          <section>
            <Eyebrow>Phase control</Eyebrow>
            <PhaseControl />
          </section>

          <section>
            <Eyebrow>Sessions</Eyebrow>
            <p className="mb-2 mt-1 text-body-sm text-text-muted">
              Every strength session in the programme. Tap one to see its exercises.
            </p>
            <SessionsBrowser />
          </section>

          {/* Kit & setup — below phase on mobile; hidden on the right at lg */}
          <section className="lg:hidden">
            <Eyebrow>Sauna protocol</Eyebrow>
            <SaunaPane />
          </section>

          <section>
            <Eyebrow>Kit &amp; setup</Eyebrow>
            <Card className="mt-1">
              <p className="text-body-sm text-text">Space is the constraint worth solving.</p>
              <dl className="mt-2 space-y-2 text-body-sm">
                {KIT.map(([k, v]) => (
                  <div key={k} className="grid grid-cols-[10rem_1fr] gap-3 narrow:grid-cols-1 narrow:gap-0.5">
                    <dt className="font-display text-text">{k}</dt>
                    <dd className="text-text-muted">{v}</dd>
                  </div>
                ))}
              </dl>
            </Card>
          </section>
        </div>

        {/* RIGHT PANE — sauna protocol, only visible at lg+ */}
        <aside className="hidden lg:block">
          <Eyebrow>Sauna protocol</Eyebrow>
          <div className="mt-1">
            <SaunaPane />
          </div>
        </aside>
      </div>
    </TabScaffold>
  );
}

/*
 * DEV-only visual harness. Renders the real shared components with static props
 * so the design can be screenshotted without signing in (the app is auth-gated
 * and reference tables are `authenticated`-only). Never bundled behind the auth
 * gate in production — Gate only mounts this when `import.meta.env.DEV`.
 */
import { Icon, type IconName } from '@/components/Icon';
import { BottomNav } from '@/components/BottomNav';
import { SideNavView } from '@/components/SideNav';
import { Card, Eyebrow, Heading, Button, Badge, Pill, Chip } from '@/components/ui';

/** Static replica of the Today landing composition (mirrors TodayPage markup) so
 *  the auth-gated landing screen can be screenshotted against the mockup. */
function TodayMock() {
  const chips = [
    ['Goblet squat', '2×8'],
    ['Back squat', '4×4–6'],
    ['RDL', '3×6'],
    ['BSS', '3×6 / leg'],
  ];
  return (
    <div className="space-y-6">
      <header>
        <div className="flex items-center gap-2">
          <Badge tone="accent">Phase 1</Badge>
          <span className="truncate text-body-sm text-text-muted">Foundation → Max Strength</span>
        </div>
        <p className="mt-3 font-display text-label font-semibold uppercase tracking-label text-text-dim">
          TUESDAY 18 AUGUST
        </p>
        <div className="mt-1 flex items-baseline gap-3">
          <span className="font-body text-display-xl font-bold leading-none text-text">346</span>
          <span className="text-body-sm text-text-muted">days to Lakeland 100</span>
        </div>
      </header>

      <Card>
        <Eyebrow bullet meta="~55 min · 8 moves">Today's strength</Eyebrow>
        <Heading className="mt-2 text-[26px]">Lower A — Heavy Strength</Heading>
        <p className="mt-2 text-body-sm text-text-muted">
          The money session. Warm up properly, lift heavy, leave crisp.
        </p>
        <div className="mt-3 flex flex-wrap gap-1.5">
          {chips.map(([n, p]) => (
            <Chip key={n}>
              {n}
              <span className="ml-1 text-text-dim">{p}</span>
            </Chip>
          ))}
          <Chip>+4 more</Chip>
        </div>
        <div className="mt-4">
          <Button full>
            Start session <Icon name="north_east" size={18} />
          </Button>
        </div>
      </Card>

      <Card>
        <div className="flex items-start gap-3">
          <Icon name="local_fire_department" size={26} fill className="mt-0.5 text-warning" />
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <Heading>Post-lift sauna</Heading>
              <Badge tone="warning">optional</Badge>
            </div>
            <p className="mt-0.5 text-body-sm text-text-muted">
              15 min · 70–80 °C · after the session
            </p>
          </div>
        </div>
        <div className="mt-3 flex items-center gap-2">
          <Button>Log this sauna</Button>
          <Button variant="ghost">Detail</Button>
        </div>
      </Card>
    </div>
  );
}

const ALL_ICONS: IconName[] = [
  'today', 'calendar_month', 'checklist', 'fitness_center', 'restaurant', 'monitoring',
  'local_fire_department', 'play_arrow', 'check_circle', 'close', 'add', 'chevron_left',
  'chevron_right', 'expand_more', 'expand_less', 'refresh', 'lock', 'lightbulb',
  'offline_bolt', 'volume_up', 'volume_off', 'more_horiz', 'ios_share', 'book', 'timer',
  'north_east', 'star',
];

export function Preview() {
  return (
    <div className="min-h-screen bg-bg pb-28 lg:pl-sidebar">
      <SideNavView phaseLabel="Phase 1" daysToRace={346} />
      <div className="mx-auto max-w-content space-y-6 px-4 py-6">
        <p className="font-display text-[26px] font-bold text-text">Preview harness</p>

        {/* Today landing composition (static mirror of TodayPage) */}
        <section>
          <Eyebrow tone="muted">Today (static replica)</Eyebrow>
          <div className="mt-2">
            <TodayMock />
          </div>
        </section>

        {/* Icon grid — proves the Material Symbols font loads (no tofu) */}
        <section>
          <Eyebrow>Icon set · outline / fill</Eyebrow>
          <Card className="mt-1">
            <div className="grid grid-cols-6 gap-4 text-text">
              {ALL_ICONS.map((n) => (
                <div key={n} className="flex flex-col items-center gap-1 text-center">
                  <Icon name={n} size={24} />
                  <span className="text-[9px] text-text-dim">{n}</span>
                </div>
              ))}
            </div>
            <div className="mt-4 flex items-center gap-4 text-accent">
              {(['today', 'restaurant', 'check_circle', 'local_fire_department'] as IconName[]).map(
                (n) => (
                  <Icon key={n} name={n} size={28} fill />
                ),
              )}
            </div>
          </Card>
        </section>

        {/* Buttons */}
        <section>
          <Eyebrow>Buttons</Eyebrow>
          <div className="mt-1 space-y-2">
            <Button full>
              Start session <Icon name="north_east" size={18} />
            </Button>
            <div className="flex gap-2">
              <Button variant="ghost">
                <Icon name="lock" size={18} /> Keep awake
              </Button>
              <Button>
                <Icon name="play_arrow" size={18} fill /> Play
              </Button>
            </div>
          </div>
        </section>

        {/* Badges + pills */}
        <section>
          <Eyebrow>Badges &amp; pills</Eyebrow>
          <Card className="mt-1 space-y-3">
            <div className="flex flex-wrap gap-2">
              <Badge tone="accent">2m</Badge>
              <Badge tone="warning">optional</Badge>
              <Badge tone="danger">🌶️🌶️</Badge>
              <Badge tone="food">£</Badge>
              <Badge>serves 2</Badge>
            </div>
            <div className="flex flex-wrap gap-2">
              <Pill active onClick={() => {}}>Lower</Pill>
              <Pill active={false} onClick={() => {}}>Upper</Pill>
              <Pill active={false} onClick={() => {}}>Core</Pill>
            </div>
          </Card>
        </section>

        {/* Sauna card composition */}
        <section>
          <Eyebrow>Sauna card</Eyebrow>
          <Card className="mt-1">
            <div className="flex items-start gap-3">
              <Icon name="local_fire_department" size={26} fill className="text-warning" />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <Heading>Post-lift sauna</Heading>
                  <Badge tone="warning">optional</Badge>
                </div>
                <p className="mt-0.5 text-body-sm text-text-muted">
                  15 min · 70–80 °C · after the session
                </p>
              </div>
              <Button variant="ghost">Log</Button>
            </div>
          </Card>
        </section>
      </div>
      <BottomNav />
    </div>
  );
}

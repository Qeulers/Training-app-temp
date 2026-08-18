import { NavLink } from 'react-router-dom';
import { Icon } from './Icon';
import { NAV_ITEMS } from './navItems';
import { ThemeToggle } from './ThemeToggle';
import { useShellStatus } from '@/features/shared/useShellStatus';

/**
 * Labeled left sidebar for wide screens (≥lg) — the design's iPad-landscape /
 * desktop chrome (title + phase/countdown, vertical nav with active pill, theme
 * toggle + sync status). The phone/tablet-portrait layout uses BottomNav
 * instead; only one is visible at a time.
 *
 * Split into a pure `SideNavView` (renderable with static props — used by the
 * dev preview harness) and the connected `SideNav` that reads live status.
 */
export function SideNav() {
  const { phaseLabel, daysToRace } = useShellStatus();
  return <SideNavView phaseLabel={phaseLabel} daysToRace={daysToRace} />;
}

export function SideNavView({
  phaseLabel,
  daysToRace,
}: {
  phaseLabel: string | null;
  daysToRace: number | null;
}) {
  return (
    <nav
      aria-label="Sections"
      className="fixed inset-y-0 left-0 z-10 hidden w-sidebar flex-col border-r border-border bg-surface px-3 py-4 lg:flex"
    >
      {/* Brand + status */}
      <div className="px-2">
        <p className="font-display text-body font-bold leading-tight text-text">Training &amp; Meals</p>
        {(phaseLabel || daysToRace != null) && (
          <p className="mt-0.5 text-meta text-text-dim">
            {phaseLabel}
            {phaseLabel && daysToRace != null ? ' · ' : ''}
            {daysToRace != null ? `${daysToRace} d to race` : ''}
          </p>
        )}
      </div>

      {/* Nav */}
      <ul className="mt-6 flex-1 space-y-1">
        {NAV_ITEMS.map((t) => (
          <li key={t.to}>
            <NavLink
              to={t.to}
              className={({ isActive }) =>
                [
                  'flex items-center gap-3 rounded-md px-3 py-2 font-display text-body-sm uppercase tracking-label transition-colors duration-fast ease-brand',
                  isActive
                    ? 'bg-accent text-accent-ink'
                    : 'text-text-muted hover:bg-surface-raised hover:text-text',
                ].join(' ')
              }
            >
              {({ isActive }) => (
                <>
                  <Icon name={t.icon} size={20} fill={isActive} />
                  <span>{t.label}</span>
                </>
              )}
            </NavLink>
          </li>
        ))}
      </ul>

      {/* Footer: theme + sync */}
      <div className="mt-4 space-y-3 px-1">
        <ThemeToggle />
        <p className="flex items-center gap-1.5 px-2 text-meta text-text-dim">
          <span aria-hidden className="inline-block h-1.5 w-1.5 rounded-full bg-success" />
          Synced
        </p>
      </div>
    </nav>
  );
}

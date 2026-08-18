import { NavLink } from 'react-router-dom';
import { Icon } from './Icon';
import { NAV_ITEMS } from './navItems';

/**
 * Bottom tab bar for phone / tablet-portrait (<lg). Wide screens use SideNav
 * instead — only one nav is visible at a time.
 */
export function BottomNav() {
  return (
    <nav
      aria-label="Sections"
      className="fixed inset-x-0 bottom-0 z-10 border-t border-border bg-surface pb-[env(safe-area-inset-bottom)] lg:hidden"
    >
      <ul className="mx-auto flex max-w-content">
        {NAV_ITEMS.map((t) => (
          <li key={t.to} className="flex-1">
            <NavLink
              to={t.to}
              className={({ isActive }) =>
                [
                  'flex min-h-tap flex-col items-center justify-center gap-0.5 px-1 py-2 text-label font-display uppercase tracking-label transition-colors duration-fast ease-brand',
                  isActive ? 'text-accent' : 'text-text-dim hover:text-text',
                ].join(' ')
              }
            >
              {({ isActive }) => (
                <>
                  <Icon name={t.icon} size={22} fill={isActive} />
                  <span>{t.label}</span>
                </>
              )}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}

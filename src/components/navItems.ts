import type { IconName } from './Icon';

/** The six sections (SPEC §6). Shared by the mobile BottomNav and the wide SideNav. */
export const NAV_ITEMS: { to: string; label: string; icon: IconName }[] = [
  { to: '/today', label: 'Today', icon: 'today' },
  { to: '/calendar', label: 'Calendar', icon: 'calendar_month' },
  { to: '/plan', label: 'Plan', icon: 'checklist' },
  { to: '/moves', label: 'Moves', icon: 'fitness_center' },
  { to: '/food', label: 'Food', icon: 'restaurant' },
  { to: '/stats', label: 'Stats', icon: 'monitoring' },
];

import { useTheme, type ThemePref } from '@/theme/ThemeProvider';
import { Icon, type IconName } from './Icon';

const NEXT: Record<ThemePref, string> = { system: 'Auto', light: 'Light', dark: 'Dark' };
const ICON: Record<ThemePref, IconName> = {
  system: 'refresh',
  light: 'lightbulb',
  dark: 'lightbulb',
};

/** Cycles Auto → Light → Dark. Shows the current preference. */
export function ThemeToggle() {
  const { pref, cycle } = useTheme();
  return (
    <button
      onClick={cycle}
      aria-label={`Theme: ${NEXT[pref]}. Tap to change.`}
      title={`Theme: ${NEXT[pref]}`}
      className="flex min-h-tap items-center gap-1.5 rounded-full border border-border bg-surface px-3
                 text-body-sm font-display uppercase tracking-label text-text-muted
                 transition-colors duration-fast ease-brand hover:text-text"
    >
      <Icon name={ICON[pref]} size={16} fill={pref === 'dark'} />
      {NEXT[pref]}
    </button>
  );
}

import type { Config } from 'tailwindcss';

/*
 * Semantic tokens only. Every utility resolves to a CSS var defined in
 * src/theme/theme.css, so the palette is tweakable in one place and dark mode
 * is a var-swap under `.dark`. Do NOT add raw hex values here — add a token to
 * theme.css and map it below.
 */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        bg: 'var(--color-bg)',
        surface: 'var(--color-surface)',
        'surface-raised': 'var(--color-surface-raised)',
        border: 'var(--color-border)',
        'border-strong': 'var(--color-border-strong)',
        text: {
          DEFAULT: 'var(--color-text)',
          muted: 'var(--color-text-muted)',
          dim: 'var(--color-text-dim)',
        },
        accent: {
          DEFAULT: 'var(--color-accent)',
          ink: 'var(--color-accent-ink)',
        },
        success: 'var(--color-success)',
        warning: 'var(--color-warning)',
        danger: 'var(--color-danger)',
        food: 'var(--color-food)',
      },
      fontFamily: {
        display: 'var(--font-display)',
        body: 'var(--font-body)',
      },
      fontSize: {
        'display-xl': 'var(--fs-display-xl)',
        display: 'var(--fs-display)',
        data: 'var(--fs-data)',
        body: 'var(--fs-body)',
        'body-sm': 'var(--fs-body-sm)',
        meta: 'var(--fs-meta)',
        label: 'var(--fs-label)',
      },
      borderRadius: {
        sm: 'var(--r-sm)',
        md: 'var(--r-md)',
        lg: 'var(--r-lg)',
        xl: 'var(--r-xl)',
        full: 'var(--r-full)',
      },
      maxWidth: {
        content: 'var(--content-max)',
      },
      spacing: {
        rail: 'var(--rail-w)',
        sidebar: 'var(--sidebar-w)',
        tap: 'var(--tap-min)',
      },
      letterSpacing: {
        // Uppercase eyebrows/labels use ~0.12em tracking in the design system.
        label: '0.12em',
      },
      transitionTimingFunction: {
        brand: 'var(--ease)',
      },
      transitionDuration: {
        fast: 'var(--dur-fast)',
        base: 'var(--dur-base)',
        slow: 'var(--dur-slow)',
      },
      screens: {
        // Year view drops 3→2 cols below 420px; nav rail appears on wider screens.
        narrow: { max: '420px' },
      },
    },
  },
  plugins: [],
} satisfies Config;

import type { Config } from 'tailwindcss';

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: 'var(--bg)',
        surface: 'var(--surface)',
        raised: 'var(--raised)',
        ink: 'var(--ink)',
        hairline: 'var(--hairline)',
        'accent-ink': 'var(--accent-ink)',
        primary: 'var(--primary)',
        'on-primary': 'var(--on-primary)',
        muted: 'var(--muted)',
        accent: 'var(--accent)',
        'on-accent': 'var(--on-accent)',
        danger: 'var(--danger)',
        pr: 'var(--pr)',
        scrim: 'var(--scrim)',
      },
      // Accent-coloured text and lines use accent-ink (AA on Paper); fills keep the lime.
      textColor: { accent: 'var(--accent-ink)' },
      borderColor: { accent: 'var(--accent-ink)' },
      fontFamily: {
        sans: [
          '"Geist Variable"',
          'ui-sans-serif',
          'system-ui',
          '-apple-system',
          'Segoe UI',
          'Roboto',
          'sans-serif',
        ],
        mono: [
          '"Geist Mono Variable"',
          'ui-monospace',
          'SFMono-Regular',
          'Menlo',
          'Consolas',
          'monospace',
        ],
      },
      // Scale: 11 micro / 13 / 15 / 18 / 24 / 40 display.
      fontSize: {
        micro: ['11px', '16px'],
        xs: ['13px', '18px'],
        sm: ['15px', '22px'],
        base: ['18px', '24px'],
        xl: ['24px', '30px'],
        '2xl': ['24px', '30px'],
        display: ['40px', '42px'],
      },
      borderRadius: {
        card: '8px',
        btn: '6px',
        chip: '4px',
      },
      letterSpacing: { micro: '0.08em' },
      spacing: {
        gutter: '16px',
      },
      minHeight: { touch: '48px' },
      minWidth: { touch: '48px' },
      maxWidth: { app: '560px' },
      transitionDuration: { DEFAULT: '120ms' },
      transitionTimingFunction: { DEFAULT: 'ease-out' },
    },
  },
  plugins: [],
} satisfies Config;

import type { Config } from 'tailwindcss';

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: 'var(--bg)',
        surface: 'var(--surface)',
        text: 'var(--text)',
        muted: 'var(--text-muted)',
        border: 'var(--border)',
        accent: 'var(--accent)',
        'accent-soft': 'var(--accent-soft)',
        'on-accent': 'var(--on-accent)',
        success: 'var(--success)',
        'success-soft': 'var(--success-soft)',
        warning: 'var(--warning)',
        danger: 'var(--danger)',
        pr: 'var(--pr)',
      },
      fontFamily: {
        sans: [
          '"Inter Variable"',
          'ui-sans-serif',
          'system-ui',
          '-apple-system',
          'Segoe UI',
          'Roboto',
          'sans-serif',
        ],
      },
      fontSize: {
        xs: ['13px', '18px'],
        sm: ['15px', '22px'],
        base: ['17px', '24px'],
        xl: ['22px', '28px'],
        '2xl': ['28px', '34px'],
      },
      borderRadius: {
        card: '16px',
        btn: '12px',
      },
      boxShadow: {
        card: '0 1px 2px rgb(0 0 0 / .04), 0 4px 16px rgb(0 0 0 / .04)',
      },
      spacing: {
        gutter: '16px',
      },
      minHeight: { touch: '48px' },
      minWidth: { touch: '48px' },
      maxWidth: { app: '560px' },
      transitionDuration: { DEFAULT: '150ms' },
    },
  },
  plugins: [],
} satisfies Config;

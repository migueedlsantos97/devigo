import type { Config } from 'tailwindcss';

export default {
  content: ['./src/**/*.{ts,tsx}', '../../packages/ui/src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ev: {
          DEFAULT: 'var(--ev)', light: 'var(--ev-light)', deep: 'var(--ev-deep)',
          brand: 'var(--ev-brand)', border: 'var(--ev-border)', active: 'var(--ev-active)',
          subtle: 'var(--ev-subtle)', on: 'var(--ev-on)', soft: 'var(--ev-soft)', text: 'var(--ev-text)',
        },
        risk: { DEFAULT: 'var(--risk)', border: 'var(--risk-border)', soft: 'var(--risk-soft)', strong: 'var(--risk-strong)' },
        danger: { DEFAULT: 'var(--danger)', bg: 'var(--danger-bg)', border: 'var(--danger-border)', text: 'var(--danger-text)' },
        model: 'var(--model)',
        canvas: 'var(--canvas)',
        band: 'var(--band)',
        sunken: 'var(--sunken)',
        raised: 'var(--raised)',
        card: 'var(--card)',
        btn: 'var(--btn)',
        hairline: 'var(--hairline)',
        edge: 'var(--edge)',
        'edge-soft': 'var(--edge-soft)',
        ctrl: { DEFAULT: 'var(--ctrl)', hover: 'var(--ctrl-hover)', strong: 'var(--ctrl-strong)' },
        ink: {
          DEFAULT: 'var(--text)', bright: 'var(--text-bright)', 2: 'var(--text-2)',
          3: 'var(--text-3)', 4: 'var(--text-4)', 5: 'var(--text-5)',
        },
      },
      screens: { panel: '1100px' },
      fontFamily: {
        sans: ['Geist', 'system-ui', 'sans-serif'],
        mono: ['Geist Mono', 'ui-monospace', 'monospace'],
      },
    },
  },
  plugins: [],
} satisfies Config;

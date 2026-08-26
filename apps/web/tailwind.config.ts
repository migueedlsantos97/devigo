import type { Config } from 'tailwindcss';

export default {
  content: ['./src/**/*.{ts,tsx}', '../../packages/ui/src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ev: { DEFAULT: '#34d399', light: '#6ee7b7', deep: '#082f24', brand: '#0d1f19', border: '#0f5c43', active: '#0f9d6e', subtle: '#1f4237', on: '#052e21' },
        risk: { DEFAULT: '#f59e0b', border: '#4a3410' },
        danger: { DEFAULT: '#f43f5e', bg: '#2a1116', border: '#7f1d3a', text: '#fda4af' },
        model: '#38bdf8',
        canvas: '#09090b',
        band: '#0b0b0e',
        sunken: '#0c0c10',
        raised: '#101014',
        card: '#141419',
        hairline: '#17171b',
        edge: '#1c1c21',
        ctrl: '#232329',
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

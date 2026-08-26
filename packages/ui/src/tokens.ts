export const tokens = {
  surface: { base: '#09090b', raised: '#101014', card: '#141419', line: '#232329' },
  text: { primary: '#f4f4f5', secondary: '#a1a1aa', muted: '#71717a' },
  accent: { ev: '#34d399', evDim: '#065f46', risk: '#f59e0b', danger: '#f43f5e', info: '#38bdf8' },
  radius: { sm: '6px', md: '10px', lg: '14px' },
  font: {
    sans: "'Geist', 'Inter Tight', system-ui, sans-serif",
    mono: "'Geist Mono', 'JetBrains Mono', ui-monospace, monospace",
  },
} as const;

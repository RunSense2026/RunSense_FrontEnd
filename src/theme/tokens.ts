// RunSense design tokens — purple+blue gradient dark theme
// Mirrors tokens.css for use in places where NativeWind classes don't fit
// (gradients, dynamic colors, svg fills).

export const colors = {
  purple: {
    50: '#f5f3ff',
    200: '#c4b5fd',
    300: '#a78bfa',
    400: '#8b5cf6',
    500: '#7c3aed',
    600: '#6d28d9',
    700: '#5b21b6',
  },
  blue: {
    300: '#93c5fd',
    400: '#60a5fa',
    500: '#3b82f6',
    600: '#2563eb',
  },
  semantic: {
    good: '#6ee7b7',
    good2: '#10b981',
    warn: '#fbbf24',
    warn2: '#f59e0b',
    bad: '#f87171',
    bad2: '#ef4444',
  },
  surface: {
    bg: '#0a0716',
    card: 'rgba(255,255,255,0.06)',
    cardStrong: 'rgba(255,255,255,0.10)',
    cardBorder: 'rgba(255,255,255,0.08)',
    cardBorderStrong: 'rgba(167,139,250,0.28)',
    divider: 'rgba(255,255,255,0.06)',
  },
  text: {
    t1: '#ffffff',
    t2: 'rgba(255,255,255,0.66)',
    t3: 'rgba(255,255,255,0.40)',
    t4: 'rgba(255,255,255,0.22)',
  },
  zone: {
    z1: '#93c5fd',
    z2: '#6ee7b7',
    z3: '#a78bfa',
    z4: '#fbbf24',
    z5: '#f87171',
  },
};

export const gradients = {
  bg: ['#0f0a2e', '#1a1250', '#0e2a50'] as [string, string, string],
  bgSoft: ['#1a1040', '#2a1b6b', '#1e3a7a', '#162d5e'] as [string, string, string, string],
  action: ['#7c3aed', '#3b82f6'] as [string, string],
  coach: ['rgba(124,58,237,0.32)', 'rgba(59,130,246,0.24)'] as [string, string],
  danger: ['#ef4444', '#dc2626'] as [string, string],
  sheet: ['#1a1040', '#0e2042'] as [string, string],
};

export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 22,
};

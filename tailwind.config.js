/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './App.tsx',
    './src/**/*.{js,jsx,ts,tsx}',
  ],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        // Brand
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
        // Semantic
        good: '#6ee7b7',
        'good-2': '#10b981',
        warn: '#fbbf24',
        'warn-2': '#f59e0b',
        bad: '#f87171',
        'bad-2': '#ef4444',
        // Heart-rate zones
        z1: '#93c5fd',
        z2: '#6ee7b7',
        z3: '#a78bfa',
        z4: '#fbbf24',
        z5: '#f87171',
        // Surface (dark)
        'rs-bg': '#0a0716',
        'rs-card': 'rgba(255,255,255,0.06)',
        'rs-card-strong': 'rgba(255,255,255,0.10)',
        'rs-card-border': 'rgba(255,255,255,0.08)',
        'rs-card-border-strong': 'rgba(167,139,250,0.28)',
        'rs-divider': 'rgba(255,255,255,0.06)',
        // Text on dark
        t1: '#ffffff',
        t2: 'rgba(255,255,255,0.66)',
        t3: 'rgba(255,255,255,0.40)',
        t4: 'rgba(255,255,255,0.22)',
        // Keep existing primary aliases for backward compatibility
        primary: {
          DEFAULT: '#3B82F6',
          dark: '#2563EB',
        },
        background: '#F9FAFB',
      },
      borderRadius: {
        'rs-sm': '8px',
        'rs-md': '12px',
        'rs-lg': '16px',
        'rs-xl': '22px',
      },
      fontFamily: {
        rs: ['SF Pro Display', 'Pretendard', 'Apple SD Gothic Neo', 'system-ui'],
        'rs-mono': ['SF Mono', 'JetBrains Mono', 'ui-monospace'],
      },
    },
  },
  plugins: [],
};

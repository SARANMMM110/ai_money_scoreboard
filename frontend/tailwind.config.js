/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: 'var(--bg)',
        surface: 'var(--surface)',
        'surface-2': 'var(--surface-2)',
        line: 'var(--line)',
        text: 'var(--text)',
        'text-dim': 'var(--text-dim)',
        'text-faint': 'var(--text-faint)',
        brand: 'var(--brand)',
        'brand-deep': 'var(--brand-deep)',
        'sig-critical': 'var(--sig-critical)',
        'sig-caution': 'var(--sig-caution)',
        'sig-good': 'var(--sig-good)',
        'sig-ready': 'var(--sig-ready)',
      },
      fontFamily: {
        display: ['"Clash Display"', '"Space Grotesk"', 'system-ui', 'sans-serif'],
        body: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'monospace'],
      },
      fontSize: {
        xs: ['12px', { lineHeight: '1.5' }],
        sm: ['14px', { lineHeight: '1.5' }],
        base: ['16px', { lineHeight: '1.6' }],
        lg: ['20px', { lineHeight: '1.4' }],
        xl: ['28px', { lineHeight: '1.2' }],
        '2xl': ['40px', { lineHeight: '1.1' }],
        '3xl': ['64px', { lineHeight: '1' }],
        '4xl': ['96px', { lineHeight: '1' }],
      },
      boxShadow: {
        panel: '0 4px 24px rgba(0,0,0,0.25)',
        card: '0 2px 12px rgba(0,0,0,0.15)',
      },
    },
  },
  plugins: [],
};

import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        evergreen: '#0F766E',
        teal: '#14B8A6',
        sky: '#38BDF8',
        success: '#22C55E',
        warning: '#F59E0B',
        error: '#EF4444',
        gray: {
          50: '#F8FAFC',
          100: '#F1F5F9',
          200: '#E2E8F0',
          600: '#475569',
          900: '#0F172A',
        },
      },
      fontFamily: {
        display: ['var(--font-manrope)', 'sans-serif'],
        body: ['var(--font-inter)', 'sans-serif'],
      },
      boxShadow: {
        card: '0 4px 10px rgba(15,23,42,0.05), 0 10px 25px -8px rgba(15,23,42,0.10)',
      },
    },
  },
  plugins: [],
};

export default config;

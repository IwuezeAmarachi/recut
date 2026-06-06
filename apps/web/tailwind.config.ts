import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        bg: '#0D0D0D',
        surface: {
          1: '#141414',
          2: '#1C1C1E',
          3: '#2C2C2E',
          4: '#3A3A3C',
        },
        edge: {
          DEFAULT: 'rgba(255,255,255,0.08)',
          subtle: 'rgba(255,255,255,0.04)',
          strong: 'rgba(255,255,255,0.15)',
        },
        ink: {
          1: '#F5F5F7',
          2: 'rgba(235,235,245,0.55)',
          3: 'rgba(235,235,245,0.28)',
        },
        accent: {
          DEFAULT: '#0A84FF',
          subtle: 'rgba(10,132,255,0.14)',
          green: '#30D158',
          orange: '#FF9F0A',
        },
      },
      fontFamily: {
        sans: ['var(--font-inter)', '-apple-system', 'BlinkMacSystemFont', 'system-ui', 'sans-serif'],
      },
      fontSize: {
        '2xs': ['0.625rem', { lineHeight: '1rem' }],
      },
      boxShadow: {
        pill: '0 2px 12px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.08)',
        float: '0 8px 32px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.07)',
      },
      animation: {
        'fade-in': 'fadeIn 0.15s ease-out',
        'slide-up': 'slideUp 0.2s cubic-bezier(0.16,1,0.3,1)',
      },
      keyframes: {
        fadeIn: {
          from: { opacity: '0' },
          to: { opacity: '1' },
        },
        slideUp: {
          from: { opacity: '0', transform: 'translateY(6px) scale(0.98)' },
          to: { opacity: '1', transform: 'translateY(0) scale(1)' },
        },
      },
    },
  },
  plugins: [],
};

export default config;

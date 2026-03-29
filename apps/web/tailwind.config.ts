import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'monospace'],
      },
      keyframes: {
        'slide-in-right': {
          '0%': { transform: 'translateX(100%)', opacity: '0' },
          '100%': { transform: 'translateX(0)', opacity: '1' },
        },
        'slide-out-right': {
          '0%': { transform: 'translateX(0)', opacity: '1' },
          '100%': { transform: 'translateX(100%)', opacity: '0' },
        },
      },
      animation: {
        'slide-in-right': 'slide-in-right 0.3s ease-out',
        'slide-out-right': 'slide-out-right 0.3s ease-in forwards',
      },
      colors: {
        surface: {
          DEFAULT: '#0a0a0f',
          card: '#12121a',
          elevated: '#1a1a26',
          hover: '#22222e',
        },
        accent: {
          green: '#22c55e',
          red: '#f87171',
          amber: '#fbbf24',
        },
        text: {
          DEFAULT: '#f0f0f5',
          muted: 'rgba(240, 240, 245, 0.5)',
          faint: 'rgba(240, 240, 245, 0.3)',
        },
        border: {
          DEFAULT: 'rgba(255, 255, 255, 0.06)',
        },
      },
    },
  },
  plugins: [],
};

export default config;

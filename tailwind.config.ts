import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./app/**/*.{js,ts,jsx,tsx}', './components/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: '#0a0c10',
        card: '#141922',
        'card-2': '#1b2230',
        border: '#262e40',
        'border-strong': '#3a4459',
        muted: '#8e9ab0',
        accent: '#3b82f6',
        'accent-hover': '#60a5fa',
      },
      fontFamily: {
        sans: ['ui-sans-serif', 'system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
      boxShadow: {
        card: '0 1px 2px rgba(0,0,0,0.4), 0 0 0 1px rgba(255,255,255,0.02) inset',
      },
    },
  },
  plugins: [],
};

export default config;

import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./app/**/*.{js,ts,jsx,tsx}', './components/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: '#000000',
        surface: '#0c0c0c',
        'surface-2': '#141414',
        'surface-3': '#1c1c1c',
        border: '#1f1f1f',
        'border-strong': '#2f2f2f',
        text: '#fafafa',
        muted: '#8a8a8a',
        accent: '#f5c518',
        'accent-hover': '#facc15',
        'accent-soft': '#3a2e08',
      },
      fontFamily: {
        sans: ['var(--font-inter)', 'ui-sans-serif', 'system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'sans-serif'],
        mono: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'Monaco', 'Consolas', 'monospace'],
      },
      letterSpacing: {
        tightish: '-0.012em',
        tighter2: '-0.02em',
      },
    },
  },
  plugins: [],
};

export default config;

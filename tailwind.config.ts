import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./app/**/*.{js,ts,jsx,tsx}', './components/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: '#0b0d12',
        card: '#141922',
        border: '#2b3342',
        muted: '#8e9ab0',
      },
    },
  },
  plugins: [],
};

export default config;

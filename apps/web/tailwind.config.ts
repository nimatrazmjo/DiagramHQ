import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './lib/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#f0f7ff',
          100: '#e0effe',
          200: '#bae0fd',
          300: '#7cc7fb',
          400: '#36aaf6',
          500: '#0c8ee7',
          600: '#0270c5',
          700: '#0359a0',
          800: '#074c84',
          900: '#0c406e',
          950: '#082849',
        },
      },
    },
  },
  plugins: [],
};

export default config;

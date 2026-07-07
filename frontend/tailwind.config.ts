import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        ocean: {
          50: '#f0f9ff',
          100: '#e0f2fe',
          200: '#bae6fd',
          300: '#7dd3fc',
          400: '#38bdf8',
          500: '#0ea5e9',
          600: '#0284c7',
          700: '#0369a1',
          800: '#075985',
          900: '#0c4a6e',
          950: '#082f49',
        },
        sand: {
          50: '#fbfbf7',
          100: '#f5f5eb',
          200: '#e6e5ce',
          300: '#d1cea5',
          400: '#b7b27a',
          500: '#9e9854',
          600: '#817b3f',
          700: '#646033',
          800: '#4e4a29',
          900: '#413e25',
        },
      },
      fontFamily: {
        sans: ['var(--font-outfit)', 'Inter', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
export default config;

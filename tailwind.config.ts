import type { Config } from 'tailwindcss';

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      colors: {
        civic: {
          50: '#ecfdf5',
          100: '#d1fae5',
          600: '#059669',
          700: '#047857',
          800: '#065f46',
          900: '#064e3b'
        }
      }
    },
  },
  plugins: [],
} satisfies Config;

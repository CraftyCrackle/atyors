/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      keyframes: {
        'slide-up': {
          '0%': { transform: 'translateY(100%)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
      },
      animation: {
        'slide-up': 'slide-up 0.3s ease-out',
      },
      colors: {
        brand: {
          50: '#eef7ff',
          100: '#d9edff',
          200: '#bce0ff',
          300: '#8eceff',
          400: '#59b2ff',
          500: '#338fff',
          600: '#1b70f5',
          700: '#145ae1',
          800: '#1749b6',
          900: '#19408f',
          950: '#142857',
        },
        accent: {
          50: '#effef4',
          100: '#d9fde6',
          200: '#b5f9cf',
          300: '#7cf2ab',
          400: '#3ce37f',
          500: '#14c95e',
          600: '#09a74b',
          700: '#0b833e',
          800: '#0e6735',
          900: '#0d552e',
          950: '#023017',
        },
      },
    },
  },
  plugins: [],
};

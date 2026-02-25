/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
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
      },
    },
  },
  plugins: [],
};

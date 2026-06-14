/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        'rnli-blue': {
          DEFAULT: '#003087',
          light:   '#1a4a9f',
          dark:    '#001a5c',
        },
        'rnli-yellow': {
          DEFAULT: '#FFB81C',
          light:   '#ffd166',
          dark:    '#e6a300',
        },
      },
    },
  },
  plugins: [],
}

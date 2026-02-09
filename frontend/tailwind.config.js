/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'rnli-blue': {
          DEFAULT: '#003087',
          light: '#0055CC',
          dark: '#001F5C',
        },
        'rnli-yellow': {
          DEFAULT: '#FFB81C',
          light: '#FFCC4D',
          dark: '#E6A200',
        },
      },
    },
  },
  plugins: [],
}

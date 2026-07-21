/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: ['class', ':root.dark'],
  theme: {
    extend: {
      colors: {
        'sc-bg-dark': '#090D16',
        'sc-bg-dark-2': '#0b0e18',
        'sc-bg-dark-3': '#101626',
        'sc-text-dark': '#f2f4fb',
        'sc-text-dark-2': '#8891a1',
      },
    },
  },
  plugins: [],
}

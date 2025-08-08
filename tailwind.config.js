/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'primary': '#0B57D0',
        'primary-hover': '#0A4CB8',
        'surface': '#f6f8fc',
        'on-surface': '#1f1f1f',
        'surface-container': '#f0f4f9',
        'outline': '#c4c7c5',
        'compose-accent': '#C2E7FF',
        'dark-surface': '#1f1f1f',
        'dark-on-surface': '#e3e3e3',
        'dark-surface-container': '#2d2d2d',
        'dark-outline': '#444746',
      },
    },
  },
  plugins: [],
}

/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        dark: {
          900: '#0f172a',
          800: '#1e293b',
          700: '#334155',
          600: '#475569',
        },
        primary: {
          DEFAULT: '#3b82f6', // electric blue
          hover: '#2563eb',
        },
        secondary: {
          DEFAULT: '#22c55e', // neon green-ish
          hover: '#16a34a',
        }
      }
    },
  },
  plugins: [],
}

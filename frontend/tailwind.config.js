/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Manrope', 'Segoe UI', 'sans-serif'],
        display: ['Space Grotesk', 'Segoe UI', 'sans-serif'],
      },
      colors: {
        brand: {
          50: '#eef4ff',
          100: '#dbe7ff',
          200: '#bfd3ff',
          300: '#94b4ff',
          400: '#6690ff',
          500: '#3f6df9',
          600: '#2a56ee',
          700: '#2347d7',
          800: '#213aa7',
          900: '#1f3486',
        },
      },
    },
  },
  plugins: [],
};

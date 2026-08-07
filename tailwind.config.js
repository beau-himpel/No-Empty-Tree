/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{html,ts}",
  ],
  theme: {
    extend: {
      colors: {
        // Brand: calm evergreen
        pine: {
          50: '#f2f7f4',
          100: '#dfece4',
          200: '#c1d9cc',
          300: '#98bfaa',
          400: '#6ca085',
          500: '#4b8367',
          600: '#376852',
          700: '#2c5443',
          800: '#254437',
          900: '#1f382e',
          950: '#101f19',
        },
        // Accent: warm cranberry, reserved for adopt actions
        berry: {
          50: '#fdf3f4',
          100: '#fbe4e7',
          200: '#f7cdd3',
          300: '#f0a7b1',
          400: '#e67787',
          500: '#d84e62',
          600: '#c33049',
          700: '#a4243c',
          800: '#892138',
          900: '#752035',
          950: '#410d19',
        },
      },
      fontFamily: {
        sans: [
          'Inter',
          '-apple-system',
          'BlinkMacSystemFont',
          'Segoe UI',
          'Roboto',
          'sans-serif',
        ],
      },
      boxShadow: {
        card: '0 1px 2px 0 rgb(16 31 25 / 0.04), 0 1px 3px 0 rgb(16 31 25 / 0.06)',
        'card-hover': '0 4px 6px -1px rgb(16 31 25 / 0.07), 0 10px 15px -3px rgb(16 31 25 / 0.08)',
      },
    },
  },
  plugins: [],
}

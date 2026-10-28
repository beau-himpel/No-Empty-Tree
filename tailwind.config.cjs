/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./index.html",
    "./src/**/*.{ts,tsx}",
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
          '"Geist Variable"',
          '-apple-system',
          'BlinkMacSystemFont',
          '"Segoe UI"',
          'Roboto',
          'sans-serif',
        ],
      },
      letterSpacing: {
        // Robinhood-style tight display tracking
        display: '-0.035em',
        title: '-0.025em',
        snug: '-0.01em',
      },
      transitionTimingFunction: {
        // Fast start, gentle settle: used for everything that enters or expands
        out: 'cubic-bezier(0.2, 0, 0, 1)',
        // iOS sheet curve
        sheet: 'cubic-bezier(0.32, 0.72, 0, 1)',
      },
      keyframes: {
        'fade-up': {
          from: { opacity: '0', transform: 'translateY(8px)' },
          to: { opacity: '1', transform: 'none' },
        },
        'fade-in': {
          from: { opacity: '0' },
          to: { opacity: '1' },
        },
        pop: {
          '0%': { transform: 'scale(0.6)', opacity: '0' },
          '60%': { transform: 'scale(1.15)', opacity: '1' },
          '100%': { transform: 'scale(1)' },
        },
      },
      animation: {
        'fade-up': 'fade-up 360ms cubic-bezier(0.2, 0, 0, 1) both',
        'fade-in': 'fade-in 240ms ease-out both',
        pop: 'pop 420ms cubic-bezier(0.2, 0, 0, 1) both',
      },
    },
  },
  plugins: [],
}

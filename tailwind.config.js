/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: {
          900: '#0b0b14',
          800: '#12121f',
          700: '#1b1b2e',
          600: '#272740',
          500: '#3a3a5c',
        },
        brand: {
          // electric violet -> cyan energetic accent
          DEFAULT: '#7c3aed',
          400: '#a78bfa',
          500: '#8b5cf6',
          600: '#7c3aed',
        },
        // The four answer-tile colors (also paired with distinct shapes for a11y)
        choice: {
          0: '#ef4444', // red
          1: '#3b82f6', // blue
          2: '#f59e0b', // amber
          3: '#22c55e', // green
        },
      },
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        display: ['"Space Grotesk"', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      keyframes: {
        'pop-in': {
          '0%': { transform: 'scale(0.92)', opacity: '0' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
        'grow-bar': {
          '0%': { transform: 'scaleY(0)' },
          '100%': { transform: 'scaleY(1)' },
        },
        'float-up': {
          '0%': { transform: 'translateY(8px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
      },
      animation: {
        'pop-in': 'pop-in 0.25s cubic-bezier(0.34, 1.56, 0.64, 1)',
        'grow-bar': 'grow-bar 0.5s cubic-bezier(0.22, 1, 0.36, 1) forwards',
        'float-up': 'float-up 0.35s ease-out forwards',
        shimmer: 'shimmer 2.5s linear infinite',
      },
    },
  },
  plugins: [],
}

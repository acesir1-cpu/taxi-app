/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          yellow: '#FFC400',
          'yellow-dark': '#F5B800',
          navy: '#111827',
          'navy-soft': '#667085',
          teal: '#12B886',
          success: '#12B886',
          danger: '#F04438',
          bg: '#F6F7F9',
          border: '#E5E7EB',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        ambient: '0 8px 30px rgb(0 0 0 / 0.04), 0 20px 25px -5px rgb(0 0 0 / 0.03)',
        card: '0 4px 22px -4px rgba(7, 21, 39, 0.1), 0 2px 10px -2px rgba(7, 21, 39, 0.06)',
        'card-hover': '0 10px 28px -6px rgba(7, 21, 39, 0.14), 0 4px 14px -2px rgba(7, 21, 39, 0.08)',
        cta: '0 6px 20px rgba(0, 0, 0, 0.15), 0 2px 8px -2px rgba(255, 196, 0, 0.25)',
        'cta-hover':
          '0 8px 26px rgba(0, 0, 0, 0.18), 0 4px 14px -2px rgba(255, 196, 0, 0.35)',
      },
    },
  },
  plugins: [],
}

/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          yellow: '#FFC400',
          'yellow-dark': '#F7B500',
          navy: '#071527',
          'navy-soft': '#0B1220',
          teal: '#14B8A6',
          success: '#16A34A',
          danger: '#EF4444',
          /** Page canvas — slightly cooler/darker than before for clearer card separation */
          bg: '#E6ECF2',
          border: '#D8DEE6',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
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

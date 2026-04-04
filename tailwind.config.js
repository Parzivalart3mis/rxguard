/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
    "./src/components/**/*.{js,jsx}",
    "./src/App.jsx",
  ],
  theme: {
    extend: {
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0', transform: 'translateY(6px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
      animation: {
        'fade-in': 'fadeIn 0.2s ease-out both',
      },
      boxShadow: {
        card: '0 1px 3px rgba(0,0,0,0.06), 0 4px 16px rgba(0,0,0,0.06)',
      },
      colors: {
        primary: {
          50: '#f0f9ff',
          100: '#e0f2fe',
          200: '#bae6fd',
          300: '#7dd3fc',
          400: '#38bdf8',
          500: '#0ea5e9',
          600: '#0284c7',
          700: '#0369a1',
          800: '#075985',
          900: '#0c4a6e',
        },
        clinical: {
          navy: '#1e3a5f',
          teal: '#0d7377',
          amber: '#f59e0b',
          red: '#dc2626',
          green: '#16a34a',
          yellow: '#eab308',
          orange: '#f97316',
        }
      }
    },
  },
  plugins: [],
  safelist: [
    'bg-clinical-navy',
    'bg-clinical-teal', 
    'bg-clinical-amber',
    'bg-clinical-red',
    'bg-clinical-green',
    'bg-clinical-yellow',
    'bg-clinical-orange',
    'text-clinical-navy',
    'text-clinical-teal',
    'text-clinical-amber',
    'text-clinical-red',
    'text-clinical-green',
    'text-clinical-yellow',
    'text-clinical-orange',
  ]
}

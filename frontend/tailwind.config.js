/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      keyframes: {
        fadeIn: {
          '0%': { opacity: 0, transform: 'translateY(-10px)' },
          '100%': { opacity: 1, transform: 'translateY(0)' }
        },
        blob: {
          '0%': { transform: 'scale(1)' },
          '33%': { transform: 'scale(1.1)' },
          '66%': { transform: 'scale(0.9)' },
          '100%': { transform: 'scale(1)' }
        },
        pulseScale: {
          '0%': { transform: 'scale(1)' },
          '50%': { transform: 'scale(1.35)' },
          '100%': { transform: 'scale(1)' }
        },
        hotspotPulse: {
          '0%': { boxShadow: '0 0 0 0 rgba(37, 99, 235, 0.8)', opacity: 0.9 },
          '50%': { boxShadow: '0 0 0 15px rgba(37, 99, 235, 0)', opacity: 1 },
          '100%': { boxShadow: '0 0 0 0 rgba(37, 99, 235, 0)', opacity: 0.9 }
        }
      },
      animation: {
        fadeIn: 'fadeIn 0.2s ease-out',
        blob: 'blob 7s infinite',
        'pulse-scale': 'pulseScale 1s ease-in-out infinite',
        'hotspot-pulse': 'hotspotPulse 1.5s cubic-bezier(0.4, 0, 0.6, 1) infinite'
      }
    },
  },
  plugins: [],
}

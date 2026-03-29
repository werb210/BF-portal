/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./index.html', './src/**/*.{ts,tsx,js,jsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          primary: '#0B5FFF',
          secondary: '#0E7490',
          accent: '#22C55E',
        },
        status: {
          success: '#16A34A',
          warning: '#F59E0B',
          danger: '#DC2626',
          inactive: '#9CA3AF',
        },
        bg: {
          page: '#F8FAFC',
          card: '#FFFFFF',
          subtle: '#F1F5F9',
          modal: '#FFFFFF',
        },
        text: {
          primary: '#0F172A',
          secondary: '#475569',
          muted: '#94A3B8',
          inverse: '#FFFFFF',
        },
        border: '#E2E8F0',
      },
      spacing: {
        xs: '0.25rem',
        sm: '0.5rem',
        md: '1rem',
        lg: '1.5rem',
        xl: '2rem',
      },
      borderRadius: {
        sm: '0.375rem',
        md: '0.5rem',
        lg: '0.75rem',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system'],
      },
    },
  },
  plugins: [],
};

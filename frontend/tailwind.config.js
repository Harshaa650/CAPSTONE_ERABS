export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      fontFamily: { display: ['"Clash Display"', 'system-ui'], sans: ['"Plus Jakarta Sans"', 'system-ui'] },
      colors: {
        ink: { 900: '#0a0b14', 800: '#10121f', 700: '#161a2e', 600: '#1e2340' },
        accent: { DEFAULT: '#7cf7c6', pink: '#ff6ad5', amber: '#ffb547', cyan: '#5ee7ff' }
      },
      boxShadow: { glow: '0 0 40px -10px rgba(124,247,198,.45)' },
      backdropBlur: { xs: '2px' }
    }
  },
  plugins: []
}

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{html,ts}'],
  theme: {
    extend: {
      colors: {
        // Palette Neo4flix : sombre + accent rouge Netflix-like (mais plus subtil)
        ink: {
          900: '#0a0a0f',
          800: '#11111a',
          700: '#1a1a26',
          600: '#22222e',
          500: '#2c2c3a',
          400: '#3a3a4a',
          300: '#5a5a6e'
        },
        accent: {
          500: '#e63946',
          600: '#c1121f',
          400: '#ff5266'
        }
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'ui-monospace', 'SFMono-Regular', 'monospace']
      }
    }
  },
  plugins: []
}

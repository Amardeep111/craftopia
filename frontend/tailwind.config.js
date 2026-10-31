/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './app/**/*.{js,jsx,ts,tsx}',
    './pages/**/*.{js,jsx,ts,tsx}',
    './components/**/*.{js,jsx,ts,tsx}',
    './src/**/*.{js,jsx,ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        cream: '#fbf6f0',
        ivory: '#f7efe6',
        blush: '#f3d5d0',
        petal: '#e8b4b8',
        bloom: '#c96b7b',
        lavender: '#d9cde8',
        lilac: '#b89bc9',
        peach: '#f3c9b8',
        sage: '#c5d1c0',
        moss: '#7d9278',
        plum: '#5a3d4a',
        ink: '#4a342c',
        muted: '#7a645c',
        sand: '#eadfd3',
      },
      fontFamily: {
        display: ['Fraunces', 'ui-serif', 'Georgia', 'serif'],
        sans: ['Nunito', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        soft: '0 10px 30px -12px rgb(90 61 74 / 0.18)',
        lift: '0 18px 40px -16px rgb(90 61 74 / 0.28)',
      },
      borderRadius: {
        xl: '1.5rem',
        '2xl': '2rem',
      },
    },
  },
  plugins: [],
}

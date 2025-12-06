import typography from '@tailwindcss/typography';

/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        'sans': ['Inter', 'system-ui', 'sans-serif'],
      },
      colors: {
        primary: {
          50: '#fafdd6',
          100: '#f5f9c8',
          200: '#eef3a0',
          300: '#e4ed78',
          400: '#d8e550',
          500: '#647fbc',
          600: '#5a6fa8',
          700: '#4f5f94',
          800: '#444f80',
          900: '#393f6c',
        },
        secondary: {
          50: '#f0f7ff',
          100: '#e0efff',
          200: '#b9ddff',
          300: '#91adc8',
          400: '#7a9bb8',
          500: '#91adc8',
          600: '#7a9bb8',
          700: '#6383a8',
          800: '#4c6f98',
          900: '#355b88',
        },
        accent: {
          50: '#f0f9f7',
          100: '#e1f3ef',
          200: '#c3e7df',
          300: '#aed6cf',
          400: '#9bc5bf',
          500: '#aed6cf',
          600: '#9bc5bf',
          700: '#88b4af',
          800: '#75a39f',
          900: '#62928f',
        },
        cream: {
          50: '#fafdd6',
          100: '#f5f9c8',
          200: '#eef3a0',
          300: '#e4ed78',
          400: '#d8e550',
          500: '#fafdd6',
          600: '#e8f0c4',
          700: '#d6e3b2',
          800: '#c4d6a0',
          900: '#b2c98e',
        },
        blue: {
          50: '#f0f7ff',
          100: '#e0efff',
          200: '#b9ddff',
          300: '#91adc8',
          400: '#7a9bb8',
          500: '#647fbc',
          600: '#5a6fa8',
          700: '#4f5f94',
          800: '#444f80',
          900: '#393f6c',
        }
      }
    },
  },
  plugins: [
    typography,
  ],
}

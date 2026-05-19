/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html','./src/**/*.{js,jsx}'],
  theme: {
    extend: {
      fontFamily: { display: ['system-ui','sans-serif'] },
      colors: {
        ink:  { 950:'#06080f', 900:'#0d1117', 800:'#111827', 700:'#1a2332' },
        edge: { DEFAULT:'#1e2d3d', soft:'#243040' },
        blue: { sine:'#4f8ef7' },
      },
    },
  },
  plugins: [],
}

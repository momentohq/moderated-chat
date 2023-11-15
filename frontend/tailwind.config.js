/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
    "./node_modules/flowbite-react/**/*.{js,jsx,ts,tsx}"
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        lime: {
          400: '#C4F135'
        },
        green: {
          900: '#25392B',
          950: '#0E2515',
          1000: '#07130B',
        }
      },
    },
  },
  plugins: [
    require('flowbite/plugin')
  ],
}

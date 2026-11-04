/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{js,jsx,ts,tsx}'],
  presets: [require('nativewind/preset')],
  // NativeWind's web runtime throws in 'media' mode. The app's theme follows the
  // system scheme through React Native, not through this setting.
  darkMode: 'class',
  theme: {
    extend: {},
  },
  plugins: [],
};

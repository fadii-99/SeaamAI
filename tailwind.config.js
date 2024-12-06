/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Raleway', 'sans-serif'], // Set Poppins as the default sans-serif font
      },
      fontWeight: {
        thin: '100',       // Poppins Thin
        extralight: '200', // Poppins ExtraLight
        light: '300',      // Poppins Light
        normal: '400',     // Poppins Regular
        medium: '500',     // Poppins Medium
        semibold: '600',   // Poppins SemiBold
        bold: '700',       // Poppins Bold
        extrabold: '800',  // Poppins ExtraBold
        black: '900',      // Poppins Black
      },
    },
  },
  plugins: [],
};

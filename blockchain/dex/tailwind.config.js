/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        pink: {
          500: "#ff007a",
          600: "#d6006a",
        },
      },
    },
  },
  plugins: [],
};

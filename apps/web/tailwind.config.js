/** @type {import('tailwindcss').Config} */ export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        pfram: {
          primary: "#168C68",
          teal: "#42B8A5",
          pink: "#F3A6B8",
          cream: "#FFF8F2",
          text: "#155E4B",
        },
        status: {
          safe: "#2E9B68",
          attention: "#F2B84B",
          emergency: "#D9544D",
          info: "#3E8EC9",
          neutral: "#7A8490",
        },
      },
    },
  },
  plugins: [],
};

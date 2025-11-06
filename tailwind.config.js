/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,ts,jsx,tsx}",
    "./components/**/*.{js,ts,jsx,tsx}",
    "./app/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: "#f9d342",  
        peach: "#fff5ef",   
        softwhite: "#fffde7", 
      },
    },
  },
  plugins: [
    function ({ addComponents }) {
      addComponents({
        ".btn-primary": {
          backgroundColor: "#f9d342",
          color: "#000",
          borderRadius: "0.5rem",
          padding: "0.75rem 2rem",
          fontWeight: "500",
          transition: "filter 0.2s",
          cursor: "pointer",
        },
        ".btn-primary:hover": {
          filter: "brightness(0.95)",
        },
      });
    },
  ],
};

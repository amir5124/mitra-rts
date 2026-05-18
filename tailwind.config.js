// tailwind.config.js
/** @type {import('tailwindcss').Config} */
module.exports = {
  // WAJIB: Pastikan path ini sesuai dengan struktur folder kamu
  // Contoh: kalo pake src, tulisnya "./src/**/*.{js,jsx,ts,tsx}"
  content: ["./app/**/*.{js,jsx,ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {},
  },
  plugins: [],
}
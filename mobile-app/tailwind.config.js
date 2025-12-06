// tailwind.config.js
module.exports = {
  content: ["./App.{js,jsx,ts,tsx}", "./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      colors: {
        slate: {
          800: '#1e293b',
          900: '#0f172a',
          700: '#334155',
          600: '#475569',
          400: '#94a3b8',
          200: '#e2e8f0',
        },
        blue: {
          500: '#3b82f6',
          600: '#2563eb',
        },
        green: {
          500: '#22c55e',
        }
      },
    },
  },
  plugins: [],
}

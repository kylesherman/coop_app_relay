/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,jsx,ts,tsx}",
    "./components/**/*.{js,jsx,ts,tsx}",
    "./screens/**/*.{js,jsx,ts,tsx}", // If you plan to have a screens folder
  ],
  theme: {
    extend: {
      colors: {
        background: '#FAF9F6',   // eggshell
        primary: '#4CAF50',      // green (from Coop v1)
        accent: '#F59E0B',       // yellow-orange
        text: '#222222',         // default text
        muted: '#6B7280',        // secondary text
      },
      spacing: {
        // Tailwind's default spacing scale is good, uses rems by default.
        // For React Native, we'll need a way to convert these to numbers.
        // We can either define them as numbers here or convert them in our theme.ts.
        // Let's define a few common ones as numbers for direct use.
        '0': 0,
        '1': 4,
        '2': 8,
        '3': 12,
        '4': 16,
        '5': 20,
        '6': 24,
        '8': 32,
        '10': 40,
        '12': 48,
        '16': 64,
        '20': 80,
        '24': 96,
        '32': 128,
        '40': 160,
        '48': 192,
        '56': 224,
        '64': 256,
      },
      fontSize: {
        // Similarly, font sizes should be numerical for React Native
        xs: 12,
        sm: 14,
        base: 16,
        lg: 18,
        xl: 20,
        '2xl': 24,
        '3xl': 30,
        '4xl': 36,
        '5xl': 48,
        '6xl': 60,
      },
      borderRadius: {
        none: 0,
        sm: 2,
        DEFAULT: 4,
        md: 6,
        lg: 8,
        xl: 12,
        '2xl': 16,
        '3xl': 24,
        full: 9999,
      },
    },
  },
  plugins: [],
};

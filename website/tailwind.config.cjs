const colors = require('tailwindcss/colors');

module.exports = {
  content: [
    './src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}',
  ],
  theme: {
    screens: {
      sm: '640px',
      md: '768px',
      lg: '1024px',
      xl: '1280px',
      '2xl': '1536px',
    },
    extend: {
      fontFamily: {
        sans: ['"IBM Plex Sans"', 'system-ui', 'sans-serif'],
        display: ['"Space Grotesk"', '"IBM Plex Sans"', 'system-ui', 'sans-serif'],
      },
      colors: {
        gray: colors.stone,
        blue: colors.sky,
        indigo: colors.teal,
      },
      boxShadow: {
        soft: '0 18px 50px -35px rgba(15, 23, 42, 0.45)',
        float: '0 24px 60px -40px rgba(2, 132, 199, 0.45)',
      },
    },
  },
  plugins: [require('@tailwindcss/typography')],
};

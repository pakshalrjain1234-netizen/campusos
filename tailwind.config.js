/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        campus: {
          ivory: '#F6F0E5',
          'ivory-light': '#FAF7F1',
          'ivory-dark': '#EFE7D8',
          periwinkle: '#E6E9FF',
          'periwinkle-light': '#F2F4FF',
          'periwinkle-deep': '#6878CA',
          lavender: '#E9DDFB',
          'lavender-light': '#F4EDFE',
          'lavender-deep': '#8964B8',
          mint: '#D5F3E8',
          'mint-light': '#E9F9F2',
          'mint-deep': '#2E8B67',
          peach: '#FFE4CF',
          'peach-light': '#FFF2E7',
          'peach-deep': '#C06B33',
          rose: '#F8DCE8',
          'rose-light': '#FDF0F6',
          'rose-deep': '#BA3D6E',
          ink: '#24283B',
          'ink-light': '#383E58',
          slate: '#74788C',
          'slate-light': '#9CA1B4',
          border: '#E7E2DD',
          'border-dark': '#D8D1C8',
        },
      },
      fontFamily: {
        space: ['"Space Grotesk"', 'sans-serif'],
        jakarta: ['"Plus Jakarta Sans"', 'sans-serif'],
      },
      borderRadius: {
        'card-sm': '14px',
        'card': '18px',
        'card-lg': '22px',
        'card-xl': '28px',
      },
      boxShadow: {
        'pastel-sm': '0 2px 8px -2px rgba(36, 40, 59, 0.04), 0 1px 3px rgba(36, 40, 59, 0.03)',
        'pastel-md': '0 8px 24px -4px rgba(36, 40, 59, 0.06), 0 2px 8px -2px rgba(36, 40, 59, 0.04)',
        'pastel-lg': '0 16px 36px -6px rgba(36, 40, 59, 0.08), 0 4px 12px -2px rgba(36, 40, 59, 0.04)',
        'pastel-glow': '0 0 25px -4px rgba(230, 233, 255, 0.6)',
      },
    },
  },
  plugins: [],
};


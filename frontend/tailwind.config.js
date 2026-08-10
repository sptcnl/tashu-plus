/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // 실제 타슈 앱 팔레트 (Figma "00 스타일 가이드" 프레임 기준)
        cream: '#F5F3EF',
        orange: '#E8940A',
        brand: '#2B7EC1',
        navy: '#3D4A6B',
        mint: '#00A870',
        warn: '#E0533D',
      },
      fontFamily: {
        sans: ['"Noto Sans KR"', 'system-ui', '-apple-system', 'sans-serif'],
      },
      borderRadius: {
        card: '16px',
        chip: '10px',
      },
      boxShadow: {
        card: '0 2px 10px rgba(61, 74, 107, 0.08)',
        float: '0 4px 14px rgba(61, 74, 107, 0.16)',
      },
      maxWidth: {
        phone: '390px',
      },
    },
  },
  plugins: [],
}

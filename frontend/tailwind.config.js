/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ["class"],
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        background: '#050505',
        surface: '#0F0F11',
        'surface-hover': '#1A1A1C',
        border: '#27272A',
        'border-focus': '#52525B',
        primary: {
          DEFAULT: '#FFFFFF',
          foreground: '#000000',
        },
        secondary: {
          DEFAULT: '#27272A',
          foreground: '#FFFFFF',
        },
        accent: {
          DEFAULT: '#00E5FF',
          foreground: '#000000',
        },
        muted: {
          DEFAULT: '#1F1F22',
          foreground: '#A1A1AA',
        },
        success: {
          DEFAULT: '#10B981',
          bg: 'rgba(16, 185, 129, 0.1)',
        },
        danger: {
          DEFAULT: '#F43F5E',
          bg: 'rgba(244, 63, 94, 0.1)',
        },
        warning: '#F59E0B',
        card: {
          DEFAULT: '#0F0F11',
          foreground: '#FFFFFF',
        },
        popover: {
          DEFAULT: '#0F0F11',
          foreground: '#FFFFFF',
        },
        destructive: {
          DEFAULT: '#F43F5E',
          foreground: '#FFFFFF',
        },
        input: '#27272A',
        ring: '#00E5FF',
        foreground: '#FFFFFF',
      },
      borderRadius: {
        lg: '2px',
        md: '2px',
        sm: '0px',
      },
      fontFamily: {
        heading: ['var(--font-unbounded)', 'sans-serif'],
        sans: ['var(--font-plex)', 'sans-serif'],
        mono: ['var(--font-jetbrains)', 'monospace'],
      },
      keyframes: {
        'accordion-down': {
          from: { height: '0' },
          to: { height: 'var(--radix-accordion-content-height)' },
        },
        'accordion-up': {
          from: { height: 'var(--radix-accordion-content-height)' },
          to: { height: '0' },
        },
        'pulse-green': {
          '0%, 100%': { backgroundColor: 'transparent' },
          '50%': { backgroundColor: 'rgba(16, 185, 129, 0.15)' },
        },
        'pulse-red': {
          '0%, 100%': { backgroundColor: 'transparent' },
          '50%': { backgroundColor: 'rgba(244, 63, 94, 0.15)' },
        },
        'ticker': {
          '0%': { transform: 'translateX(0%)' },
          '100%': { transform: 'translateX(-50%)' },
        },
        'fade-up': {
          '0%': { opacity: '0', transform: 'translateY(12px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
      animation: {
        'accordion-down': 'accordion-down 0.2s ease-out',
        'accordion-up': 'accordion-up 0.2s ease-out',
        'pulse-green': 'pulse-green 0.6s ease-out',
        'pulse-red': 'pulse-red 0.6s ease-out',
        'ticker': 'ticker 40s linear infinite',
        'fade-up': 'fade-up 0.5s ease-out forwards',
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};

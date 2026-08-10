/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Dark cyber theme inspired by Wireshark & network dashboards
        bg: {
          primary:   '#0a0d14',
          secondary: '#111827',
          card:      '#141a24',
          elevated:  '#1a2235',
          border:    '#1f2d3d',
        },
        accent: {
          cyan:    '#00d4ff',
          blue:    '#3b82f6',
          green:   '#10b981',
          yellow:  '#f59e0b',
          red:     '#ef4444',
          purple:  '#8b5cf6',
          orange:  '#f97316',
          pink:    '#ec4899',
        },
        proto: {
          tcp:     '#3b82f6',
          udp:     '#f97316',
          dns:     '#8b5cf6',
          http:    '#10b981',
          https:   '#06b6d4',
          arp:     '#f59e0b',
          icmp:    '#ec4899',
          other:   '#6b7280',
        },
        text: {
          primary:   '#f1f5f9',
          secondary: '#94a3b8',
          muted:     '#4b5563',
          accent:    '#00d4ff',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'Consolas', 'monospace'],
      },
      backgroundImage: {
        'grid-pattern': 'linear-gradient(rgba(0, 212, 255, 0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(0, 212, 255, 0.03) 1px, transparent 1px)',
        'hero-gradient': 'radial-gradient(ellipse at top, #0d1b2e 0%, #0a0d14 50%, #0a0d14 100%)',
        'card-gradient': 'linear-gradient(135deg, #141a24 0%, #1a2235 100%)',
        'accent-gradient': 'linear-gradient(135deg, #00d4ff 0%, #3b82f6 100%)',
        'green-gradient': 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
        'purple-gradient': 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)',
        'orange-gradient': 'linear-gradient(135deg, #f97316 0%, #ea580c 100%)',
      },
      boxShadow: {
        'glow-cyan':    '0 0 20px rgba(0, 212, 255, 0.15), 0 0 40px rgba(0, 212, 255, 0.05)',
        'glow-blue':    '0 0 20px rgba(59, 130, 246, 0.2)',
        'glow-green':   '0 0 20px rgba(16, 185, 129, 0.2)',
        'glow-purple':  '0 0 20px rgba(139, 92, 246, 0.2)',
        'glow-orange':  '0 0 20px rgba(249, 115, 22, 0.2)',
        'card':         '0 4px 24px rgba(0, 0, 0, 0.4)',
        'card-hover':   '0 8px 40px rgba(0, 0, 0, 0.6)',
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'fade-in':    'fadeIn 0.3s ease-in-out',
        'slide-up':   'slideUp 0.3s ease-out',
        'slide-right':'slideRight 0.3s ease-out',
      },
      keyframes: {
        fadeIn:    { '0%': { opacity: '0' }, '100%': { opacity: '1' } },
        slideUp:   { '0%': { opacity: '0', transform: 'translateY(20px)' }, '100%': { opacity: '1', transform: 'translateY(0)' } },
        slideRight:{ '0%': { opacity: '0', transform: 'translateX(20px)' }, '100%': { opacity: '1', transform: 'translateX(0)' } },
      },
    },
  },
  plugins: [],
}

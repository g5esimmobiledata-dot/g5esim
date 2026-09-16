import type { Config } from 'tailwindcss';

export default {
  darkMode: ['class'],
  content: ['./client/index.html', './client/src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      /* ============================================
         📐 BORDER RADIUS
         ============================================ */
      borderRadius: {
        lg: '.5625rem' /* 9px */,
        md: '.375rem' /* 6px */,
        sm: '.1875rem' /* 3px */,
      },

      /* ============================================
         🎨 COLORS - Direct HEX variable references
         ============================================ */
      colors: {
        /* Background & Foreground */
        background: 'var(--background)',
        foreground: 'var(--foreground)',
        dark: 'var(--background)',

        /* Borders & Inputs */
        border: 'var(--border)',
        input: 'var(--input)',
        ring: 'var(--ring)',

        /* Primary Theme Color - WITH SHADES (Direct HEX) */
        primary: {
          DEFAULT: 'var(--primary)',
          foreground: 'var(--primary-foreground)',
          second: 'var(--primary-second)',
          third: 'var(--primary-third)',
          fourth: 'var(--primary-fourth)',
          light: 'var(--primary-light)',
          dark: 'var(--primary-dark)',
        },

        /* Secondary Theme Color - WITH SHADES (Direct HEX) */
        secondary: {
          DEFAULT: 'var(--secondary)',
          foreground: 'var(--secondary-foreground)',
          second: 'var(--secondary-second)',
          third: 'var(--secondary-third)',
          fourth: 'var(--secondary-fourth)',
          light: 'var(--secondary-light)',
        },

        /* Accent Color - WITH SHADES (Direct HEX) */
        accent: {
          DEFAULT: 'var(--accent)',
          foreground: 'var(--accent-foreground)',
          second: 'var(--accent-second)',
          third: 'var(--accent-third)',
        },

        /* Muted */
        muted: {
          DEFAULT: 'var(--muted)',
          foreground: 'var(--muted-foreground)',
        },

        /* Destructive - WITH SHADES (Direct HEX) */
        destructive: {
          DEFAULT: 'var(--destructive)',
          foreground: 'var(--destructive-foreground)',
          second: 'var(--destructive-second)',
        },

        /* Card Component */
        card: {
          DEFAULT: 'var(--card)',
          foreground: 'var(--card-foreground)',
          border: 'var(--card-border)',
        },

        /* Popover Component */
        popover: {
          DEFAULT: 'var(--popover)',
          foreground: 'var(--popover-foreground)',
          border: 'var(--popover-border)',
        },

        /* Sidebar */
        sidebar: {
          DEFAULT: 'var(--sidebar)',
          foreground: 'var(--sidebar-foreground)',
          border: 'var(--sidebar-border)',
          ring: 'var(--sidebar-ring)',
        },
        'sidebar-primary': {
          DEFAULT: 'var(--sidebar-primary)',
          foreground: 'var(--sidebar-primary-foreground)',
        },
        'sidebar-accent': {
          DEFAULT: 'var(--sidebar-accent)',
          foreground: 'var(--sidebar-accent-foreground)',
        },

        /* Chart Colors */
        chart: {
          '1': 'var(--chart-1)',
          '2': 'var(--chart-2)',
          '3': 'var(--chart-3)',
          '4': 'var(--chart-4)',
          '5': 'var(--chart-5)',
        },

        /* Status Colors */
        status: {
          online: '#22c55e',
          away: '#f59e0b',
          busy: '#ef4444',
          offline: '#9ca3af',
        },
      },

      /* ============================================
         🖋️ FONTS
         ============================================ */
      fontFamily: {
        sans: ['var(--font-sans)'],
        serif: ['var(--font-serif)'],
        mono: ['var(--font-mono)'],
      },

      /* ============================================
         🎬 ANIMATIONS
         ============================================ */
      keyframes: {
        'accordion-down': {
          from: { height: '0' },
          to: { height: 'var(--radix-accordion-content-height)' },
        },
        'accordion-up': {
          from: { height: 'var(--radix-accordion-content-height)' },
          to: { height: '0' },
        },
        'fade-in': {
          from: { opacity: '0' },
          to: { opacity: '1' },
        },
        'fade-out': {
          from: { opacity: '1' },
          to: { opacity: '0' },
        },
        'slide-in-from-top': {
          from: { transform: 'translateY(-20px)', opacity: '0' },
          to: { transform: 'translateY(0)', opacity: '1' },
        },
        'slide-in-from-bottom': {
          from: { transform: 'translateY(20px)', opacity: '0' },
          to: { transform: 'translateY(0)', opacity: '1' },
        },
        'slide-in-from-left': {
          from: { transform: 'translateX(-20px)', opacity: '0' },
          to: { transform: 'translateX(0)', opacity: '1' },
        },
        'slide-in-from-right': {
          from: { transform: 'translateX(20px)', opacity: '0' },
          to: { transform: 'translateX(0)', opacity: '1' },
        },
        marquee: {
          '0%': { transform: 'translateX(0%)' },
          '100%': { transform: 'translateX(-50%)' },
        },
        'scroll-ticker': {
          '0%': { transform: 'translateX(0)' },
          '100%': { transform: 'translateX(-50%)' },
        },
        'pulse-glow': {
          '0%, 100%': {
            boxShadow: '0 0 20px color-mix(in srgb, var(--primary) 40%, transparent)',
          },
          '50%': {
            boxShadow: '0 0 30px color-mix(in srgb, var(--primary) 60%, transparent)',
          },
        },
        spin: {
          from: { transform: 'rotate(0deg)' },
          to: { transform: 'rotate(360deg)' },
        },
        'spin-slow': {
          from: { transform: 'rotate(0deg)' },
          to: { transform: 'rotate(360deg)' },
        },
        bounce: {
          '0%, 100%': {
            transform: 'translateY(-25%)',
            animationTimingFunction: 'cubic-bezier(0.8, 0, 1, 1)',
          },
          '50%': {
            transform: 'translateY(0)',
            animationTimingFunction: 'cubic-bezier(0, 0, 0.2, 1)',
          },
        },
      },
      animation: {
        'accordion-down': 'accordion-down 0.2s ease-out',
        'accordion-up': 'accordion-up 0.2s ease-out',
        'fade-in': 'fade-in 0.5s ease-out',
        'fade-out': 'fade-out 0.5s ease-out',
        'slide-in': 'slide-in-from-bottom 0.5s ease-out',
        'slide-in-top': 'slide-in-from-top 0.5s ease-out',
        'slide-in-left': 'slide-in-from-left 0.5s ease-out',
        'slide-in-right': 'slide-in-from-right 0.5s ease-out',
        marquee: 'marquee 30s linear infinite',
        'scroll-ticker': 'scroll-ticker 25s linear infinite',
        'pulse-glow': 'pulse-glow 2s ease-in-out infinite',
        spin: 'spin 1s linear infinite',
        'spin-slow': 'spin-slow 3s linear infinite',
        bounce: 'bounce 1s infinite',
      },

      /* ============================================
         🌈 BACKGROUND GRADIENTS (Direct CSS var)
         ============================================ */
      backgroundImage: {
        'primary-gradient': 'var(--primary-gradient)',
        'button-gradient': 'var(--button-gradient)',
        'hero-gradient': 'var(--hero-gradient)',
        'hero-gradient-hover': 'var(--hero-gradient-hover)',
        'text-gradient': 'var(--text-gradient)',
        'secondary-gradient': 'var(--secondary-gradient)',
        'accent-gradient': 'var(--accent-gradient)',
      },

      /* ============================================
         📦 BOX SHADOW (Glow Effects - Direct CSS var)
         ============================================ */
      boxShadow: {
        'glow-sm': 'var(--glow-sm)',
        glow: 'var(--glow)',
        'glow-lg': 'var(--glow-lg)',
      },

      /* ============================================
         📏 SPACING (Optional - Custom spacing scale)
         ============================================ */
      spacing: {
        18: '4.5rem',
        88: '22rem',
        112: '28rem',
        128: '32rem',
      },

      /* ============================================
         📐 MAX WIDTH (Optional - Custom max widths)
         ============================================ */
      maxWidth: {
        '8xl': '88rem',
        '9xl': '96rem',
      },

      /* ============================================
         🎭 Z-INDEX (Optional - Custom z-index scale)
         ============================================ */
      zIndex: {
        60: '60',
        70: '70',
        80: '80',
        90: '90',
        100: '100',
      },
    },
  },
  plugins: [require('tailwindcss-animate'), require('@tailwindcss/typography')],
} satisfies Config;

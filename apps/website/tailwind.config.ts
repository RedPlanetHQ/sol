import type { Config } from 'tailwindcss';

const config = {
  darkMode: ['class'],
  content: [
    './app/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './modules/**/*.{ts,tsx}',
    './common/**/*.{ts,tsx}',
    './src/**/*.{ts,tsx}',
  ],
  prefix: '',
  theme: {
    container: {
      center: true,
      padding: '2rem',
      screens: {
        '2xl': '1400px',
      },
    },
    fontSize: {
      xs: '13px',
      sm: '13px',
      base: '14px',
      md: '15px',
      lg: '16px',
      xl: '20px',
      '2xl': '24px',
    },
    borderWidth: {
      '0': '0',
      '1': '1px',
      '2': '2px',
      '3': '3px',
      '4': '4px',
      '6': '6px',
      '8': '8px',
      DEFAULT: '0.5px',
    },
    extend: {
      fontFamily: {
        sans: ['var(--font-geist-sans)'],
        mono: ['var(--font-geist-mono)'],
      },
      colors: {
        border: {
          DEFAULT: 'oklch(var(--border))',
          dark: 'oklch(var(--border-dark))',
        },
        input: 'oklch(var(--input))',
        ring: 'oklch(var(--ring))',
        background: {
          '2': 'oklch(var(--background-2) / <alpha-value>)',
          '3': 'oklch(var(--background-3) / <alpha-value>)',
          DEFAULT: 'oklch(var(--background) / <alpha-value>)',
        },
        foreground: 'oklch(var(--foreground) / <alpha-value>)',
        primary: {
          DEFAULT: 'oklch(var(--primary) / <alpha-value>)',
          foreground: 'oklch(var(--primary-foreground) / <alpha-value>)',
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))',
        },
        destructive: {
          DEFAULT: 'oklch(var(--destructive) / <alpha-value>)',
          foreground: 'oklch(var(--destructive-foreground) / <alpha-value>)',
        },
        warning: {
          DEFAULT: 'oklch(var(--warning) / <alpha-value>)',
          foreground: 'oklch(var(--warning-foreground) / <alpha-value>)',
        },
        success: {
          DEFAULT: 'oklch(var(--success) / <alpha-value>)',
          foreground: 'oklch(var(--success-foreground) / <alpha-value>)',
        },
        muted: {
          DEFAULT: 'oklch(var(--muted))',
          foreground: 'oklch(var(--muted-foreground) / <alpha-value>)',
        },
        accent: {
          DEFAULT: 'oklch(var(--accent) / <alpha-value>)',
          foreground: 'oklch(var(--accent-foreground) / <alpha-value>)',
        },
        popover: {
          DEFAULT: 'oklch(var(--popover) / <alpha-value>)',
          foreground: 'oklch(var(--popover-foreground) / <alpha-value>)',
        },
        gray: {
          '50': 'var(--gray-50)',
          '100': 'var(--gray-100)',
          '200': 'var(--gray-200)',
          '300': 'var(--gray-300)',
          '400': 'var(--gray-400)',
          '500': 'var(--gray-500)',
          '600': 'var(--gray-600)',
          '700': 'var(--gray-700)',
          '800': 'var(--gray-800)',
          '900': 'var(--gray-900)',
          '950': 'var(--gray-950)',
        },
        grayAlpha: {
          '50': 'oklch(var(--grayAlpha-50))',
          '100': 'oklch(var(--grayAlpha-100))',
          '200': 'oklch(var(--grayAlpha-200))',
          '300': 'oklch(var(--grayAlpha-300))',
          '400': 'oklch(var(--grayAlpha-400))',
          '500': 'oklch(var(--grayAlpha-500))',
          '600': 'oklch(var(--grayAlpha-600))',
          '700': 'oklch(var(--grayAlpha-700))',
          '800': 'oklch(var(--grayAlpha-800))',
          '900': 'oklch(var(--grayAlpha-900))',
          '950': 'oklch(var(--grayAlpha-950))',
        },
        red: {
          '50': '#fdf3f3',
          '100': '#fbe9e8',
          '200': '#f7d4d4',
          '300': '#f0b1b1',
          '400': '#e78587',
          '500': '#d75056',
          '600': '#c43a46',
          '700': '#a52b3a',
          '800': '#8a2735',
          '900': '#772433',
          '950': '#420f18',
        },
        orange: {
          '50': '#fdf6ef',
          '100': '#fbead9',
          '200': '#f7d2b1',
          '300': '#f1b480',
          '400': '#ea8c4d',
          '500': '#e67333',
          '600': '#d65520',
          '700': '#b2401c',
          '800': '#8e341e',
          '900': '#732d1b',
          '950': '#3e140c',
        },
        yellow: {
          '50': '#fdfbe9',
          '100': '#faf7c7',
          '200': '#f7ec91',
          '300': '#f1db53',
          '400': '#ebc724',
          '500': '#dcb016',
          '600': '#c28c11',
          '700': '#976211',
          '800': '#7d4f16',
          '900': '#6b4118',
          '950': '#3e220a',
        },
        sidebar: {
          DEFAULT: 'oklch(var(--background-2) / <alpha-value>)',
          foreground: 'oklch(var(--foreground) / <alpha-value>)',
          primary: 'oklch(var(--primary) / <alpha-value>)',
          'primary-foreground':
            'oklch(var(--primary-foreground) / <alpha-value>)',
          accent: 'oklch(var(--accent) / <alpha-value>)',
          'accent-foreground':
            'oklch(var(--accent-foreground) / <alpha-value>)',
          border: 'oklch(var(--border))',
          ring: 'oklch(var(--ring))',
        },
      },
      borderRadius: {
        DEFAULT: 'var(--radius)',
        lg: 'calc(var(--radius) + 4px)',
        md: 'calc(var(--radius) + 2px)',
        sm: 'calc(var(--radius) - 2px)',
      },
      boxShadow: {
        '1': '0px 6px 20px 0px rgba(0, 0, 0, 0.15), 0px 0px 2px 0px rgba(0, 0, 0, 0.2)',
        '2': '',
      },
      keyframes: {
        'accordion-down': {
          from: {
            height: '0',
          },
          to: {
            height: 'var(--radix-accordion-content-height)',
          },
        },
        'accordion-up': {
          from: {
            height: 'var(--radix-accordion-content-height)',
          },
          to: {
            height: '0',
          },
        },
        'multiline-strikethrough': {
          '0%': { textDecorationColor: 'transparent' },
          '100%': { textDecorationColor: 'currentColor' },
        },
        'gradient-move': {
          '0%': { backgroundPosition: '0% 50%' },
          '50%': { backgroundPosition: '100% 50%' },
          '100%': { backgroundPosition: '0% 50%' },
        },
      },
      animation: {
        'accordion-down': 'accordion-down 0.2s ease-out',
        'accordion-up': 'accordion-up 0.2s ease-out',
        'multiline-strikethrough':
          'multiline-strikethrough 0.3s ease-in forwards',
        'gradient-move': 'gradient-move 3s ease-in-out infinite',
      },
    },
  },
  plugins: [
    require('tailwindcss-animate'),
    require('tailwind-scrollbar'),
    require('tailwind-scrollbar-hide'),
  ],
} satisfies Config;

export default config;

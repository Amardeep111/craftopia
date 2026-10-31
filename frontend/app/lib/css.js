/**
 * Unified CSS Design System
 * Centralized design token system for Jamae's Craftopia
 * All components should use these tokens for consistency
 */

export const designTokens = {
  // Color Palette
  colors: {
    cream: '#fbf6f0',
    ivory: '#f7efe6',
    blush: '#f3d5d0',
    petal: '#e8b4b8',
    bloom: '#c96b7b',
    lavender: '#d9cde8',
    lilac: '#b89bc9',
    peach: '#f3c9b8',
    sage: '#c5d1c0',
    moss: '#7d9278',
    plum: '#5a3d4a',
    ink: '#4a342c',
    muted: '#7a645c',
    sand: '#eadfd3',
  },

  // Typography
  typography: {
    fontFamily: {
      display: ['Fraunces', 'ui-serif', 'Georgia', 'serif'],
      sans: ['Nunito', 'ui-sans-serif', 'system-ui', 'sans-serif'],
    },
    fontSize: {
      xs: '0.75rem',        // 12px
      sm: '0.875rem',       // 14px
      base: '1rem',         // 16px
      lg: '1.125rem',       // 18px
      xl: '1.25rem',        // 20px
      '2xl': '1.5rem',      // 24px
      '3xl': '1.875rem',    // 30px
      '4xl': '2.25rem',     // 36px
      '5xl': '3rem',        // 48px
      '6xl': '3.75rem',     // 60px
    },
    lineHeight: {
      tight: '1.12',
      normal: '1.4',
      relaxed: '1.6',
    },
    letterSpacing: {
      wide: '0.22em',
      normal: '0.05em',
    },
    fontWeight: {
      regular: '400',
      medium: '500',
      semibold: '600',
      bold: '700',
    },
  },

  // Spacing
  spacing: {
    xs: '0.25rem',     // 4px
    sm: '0.5rem',      // 8px
    md: '1rem',        // 16px
    lg: '1.5rem',      // 24px
    xl: '2rem',        // 32px
    '2xl': '3rem',     // 48px
    '3xl': '4rem',     // 64px
    '4xl': '6rem',     // 96px
  },

  // Shadows
  shadows: {
    soft: '0 10px 30px -12px rgb(90 61 74 / 0.18)',
    lift: '0 18px 40px -16px rgb(90 61 74 / 0.28)',
    inner: 'inset 0 1px 2px 0 rgb(0 0 0 / 0.05)',
  },

  // Border Radius
  borderRadius: {
    sm: '0.5rem',      // 8px
    md: '0.75rem',     // 12px
    lg: '1rem',        // 16px
    xl: '1.5rem',      // 24px
    '2xl': '2rem',     // 32px
    full: '9999px',
  },

  // Transitions
  transitions: {
    fast: '150ms ease-out',
    normal: '300ms ease-out',
    slow: '500ms ease-out',
  },

  // Breakpoints
  breakpoints: {
    sm: '640px',
    md: '768px',
    lg: '1024px',
    xl: '1280px',
    '2xl': '1536px',
  },

  // Easing
  easing: {
    easeOut: [0.22, 1, 0.36, 1],
    easeIn: [0.22, 1, 0.36, 1],
  },
}

// CSS Custom Properties for Tailwind
export const cssVariables = {
  // Colors
  '--color-cream': designTokens.colors.cream,
  '--color-ivory': designTokens.colors.ivory,
  '--color-blush': designTokens.colors.blush,
  '--color-petal': designTokens.colors.petal,
  '--color-bloom': designTokens.colors.bloom,
  '--color-lavender': designTokens.colors.lavender,
  '--color-lilac': designTokens.colors.lilac,
  '--color-peach': designTokens.colors.peach,
  '--color-sage': designTokens.colors.sage,
  '--color-moss': designTokens.colors.moss,
  '--color-plum': designTokens.colors.plum,
  '--color-ink': designTokens.colors.ink,
  '--color-muted': designTokens.colors.muted,
  '--color-sand': designTokens.colors.sand,

  // Typography
  '--font-display': designTokens.typography.fontFamily.display.join(', '),
  '--font-sans': designTokens.typography.fontFamily.sans.join(', '),
  '--font-size-xs': designTokens.typography.fontSize.xs,
  '--font-size-sm': designTokens.typography.fontSize.sm,
  '--font-size-base': designTokens.typography.fontSize.base,
  '--font-size-lg': designTokens.typography.fontSize.lg,
  '--font-size-xl': designTokens.typography.fontSize.xl,
  '--font-size-2xl': designTokens.typography.fontSize['2xl'],
  '--font-size-3xl': designTokens.typography.fontSize['3xl'],
  '--font-size-4xl': designTokens.typography.fontSize['4xl'],
  '--font-size-5xl': designTokens.typography.fontSize['5xl'],
  '--font-size-6xl': designTokens.typography.fontSize['6xl'],

  // Spacing
  '--spacing-xs': designTokens.spacing.xs,
  '--spacing-sm': designTokens.spacing.sm,
  '--spacing-md': designTokens.spacing.md,
  '--spacing-lg': designTokens.spacing.lg,
  '--spacing-xl': designTokens.spacing.xl,
  '--spacing-2xl': designTokens.spacing['2xl'],
  '--spacing-3xl': designTokens.spacing['3xl'],
  '--spacing-4xl': designTokens.spacing['4xl'],

  // Shadows
  '--shadow-soft': designTokens.shadows.soft,
  '--shadow-lift': designTokens.shadows.lift,

  // Border Radius
  '--radius-sm': designTokens.borderRadius.sm,
  '--radius-md': designTokens.borderRadius.md,
  '--radius-lg': designTokens.borderRadius.lg,
  '--radius-xl': designTokens.borderRadius.xl,
  '--radius-2xl': designTokens.borderRadius['2xl'],
  '--radius-full': designTokens.borderRadius.full,
}

// Utility class names for common patterns
export const utilityClasses = {
  // Container
  container: 'container-page mx-auto w-full max-w-6xl px-4 sm:px-6 lg:px-8',

  // Cards
  card: 'paper-card rounded-3xl border border-sand/80 bg-ivory/80 shadow-soft',
  cardHover: 'paper-card rounded-3xl border border-sand/80 bg-ivory/80 shadow-soft transition duration-300 ease-out hover:-translate-y-1 hover:shadow-lift',

  // Text styles
  headingDisplay: 'heading-display font-display font-medium tracking-tight text-plum',
  bodyText: 'text-muted leading-relaxed',
  mutedText: 'text-muted',

  // Buttons
  buttonBase: 'inline-flex items-center justify-center gap-2 rounded-full font-semibold tracking-wide transition duration-300 ease-out',
  buttonDisabled: 'disabled:pointer-events-none disabled:opacity-50',

  // Forms
  inputBase: 'w-full rounded-2xl border bg-cream px-4 py-3 outline-none transition focus:ring-2 focus:ring-bloom/30',
  inputError: 'border-bloom',
  inputNormal: 'border-sand',

  // Animations
  float: 'animate-float',
  drift: 'animate-drift',
  floatSlow: 'animate-float-slow',

  // Layout
  flexCenter: 'flex items-center justify-center',
  flexCol: 'flex flex-col',
  gridCenter: 'grid place-items-center',
}

// Helper to apply design tokens as Tailwind classes
export const token = (path) => {
  const keys = path.split('.')
  let value = designTokens
  for (const key of keys) {
    value = value[key]
  }
  return value
}
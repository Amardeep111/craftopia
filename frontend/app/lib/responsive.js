/**
 * Mobile Responsiveness Enhancements
 * Additional utilities and patterns for better mobile/tablet experience
 */

export const mobileBreakpoints = {
  sm: '640px',   // Mobile landscape / Small tablets
  md: '768px',   // Tablets
  lg: '1024px',  // Desktop
  xl: '1280px',  // Large desktop
  '2xl': '1536px', // Extra large
}

export const touchTargets = {
  // Minimum 44x44px for touch targets (WCAG)
  min: 'min-h-[44px] min-w-[44px]',
  button: 'min-h-[44px] px-4',
  icon: 'h-11 w-11', // 44px
}

export const mobileSpacing = {
  // Adjusted spacing for mobile
  container: 'px-4 sm:px-6 lg:px-8',
  section: 'py-12 sm:py-16 lg:py-20',
  gap: {
    sm: 'gap-4 sm:gap-6',
    md: 'gap-6 sm:gap-8',
    lg: 'gap-8 sm:gap-12',
  },
}

export const mobileTypography = {
  // Responsive text sizes optimized for mobile readability
  hero: 'text-3xl sm:text-4xl lg:text-5xl xl:text-6xl',
  h1: 'text-2xl sm:text-3xl lg:text-4xl',
  h2: 'text-xl sm:text-2xl lg:text-3xl',
  h3: 'text-lg sm:text-xl lg:text-2xl',
  body: 'text-base sm:text-lg',
  small: 'text-sm sm:text-base',
}

export const mobileGrid = {
  // Common responsive grid patterns
  products: 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6',
  features: 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8',
  twoCol: 'grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12',
}

export const mobileInteractions = {
  // Larger touch targets and hover states
  button: 'active:scale-95 transition-transform',
  card: 'active:scale-[0.98] transition-transform',

  // Disable hover effects on touch devices
  hoverOnly: 'hover:opacity-80 active:opacity-70',
}

// Viewport height utilities for mobile (accounts for browser chrome)
export const mobileViewport = {
  full: 'min-h-screen', // Standard
  dvh: 'min-h-[100dvh]', // Dynamic viewport height (Safari)
  svh: 'min-h-[100svh]', // Small viewport height
  lvh: 'min-h-[100lvh]', // Large viewport height
}

// Safe area insets for notched devices
export const safeArea = {
  top: 'pt-[env(safe-area-inset-top)]',
  bottom: 'pb-[env(safe-area-inset-bottom)]',
  left: 'pl-[env(safe-area-inset-left)]',
  right: 'pr-[env(safe-area-inset-right)]',
  all: 'p-[env(safe-area-inset-top)]_[env(safe-area-inset-right)]_[env(safe-area-inset-bottom)]_[env(safe-area-inset-left)]',
}

// Scrollable container patterns
export const scrollContainer = {
  horizontal: 'overflow-x-auto overflow-y-hidden -mx-4 px-4 sm:mx-0 sm:px-0 scrollbar-hide',
  vertical: 'overflow-y-auto scrollbar-hide',
  snap: 'scroll-smooth snap-x snap-mandatory',
}

// Modal/overlay handling for mobile
export const mobileModal = {
  backdrop: 'fixed inset-0 bg-plum/40 backdrop-blur-sm z-50',
  panel: 'fixed inset-x-4 top-[10%] sm:inset-x-auto sm:left-1/2 sm:-translate-x-1/2 max-w-lg mx-auto',
  fullscreen: 'fixed inset-0 sm:inset-4 sm:rounded-3xl',
}

// Image aspect ratios for consistent layouts
export const aspectRatios = {
  square: 'aspect-square',
  portrait: 'aspect-[3/4]',
  landscape: 'aspect-[4/3]',
  widescreen: 'aspect-[16/9]',
  product: 'aspect-[4/5]',
}

/**
 * Check if user is on a touch device
 */
export function isTouchDevice() {
  if (typeof window === 'undefined') return false
  return 'ontouchstart' in window || navigator.maxTouchPoints > 0
}

/**
 * Get responsive image sizes attribute
 */
export function getResponsiveSizes(layout = 'default') {
  const sizes = {
    default: '(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw',
    hero: '(max-width: 768px) 100vw, 50vw',
    full: '100vw',
    half: '(max-width: 768px) 100vw, 50vw',
    third: '(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw',
    quarter: '(max-width: 640px) 100vw, (max-width: 768px) 50vw, (max-width: 1024px) 33vw, 25vw',
  }
  return sizes[layout] || sizes.default
}

/**
 * Detect viewport size
 */
export function useViewportSize() {
  if (typeof window === 'undefined') {
    return { width: 1024, height: 768, isMobile: false, isTablet: false }
  }

  const width = window.innerWidth
  const height = window.innerHeight

  return {
    width,
    height,
    isMobile: width < 768,
    isTablet: width >= 768 && width < 1024,
    isDesktop: width >= 1024,
  }
}

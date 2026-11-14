import PendingLinkIndicator from '../layout/PendingLinkIndicator'
/**
 * Button Component - Unified polymorphic button/link styles.
 * Renders as a real <a> tag when `as={Link}` is passed,
 * so Next.js routing works correctly.
 */
export default function Button({
  children,
  variant = 'primary',
  size = 'md',
  className = '',
  as: Component = 'button',
  href,
  ...props
}) {
  const baseClasses = 'inline-flex items-center justify-center gap-2 rounded-md font-semibold transition-colors duration-200 disabled:pointer-events-none disabled:opacity-50'

  const variants = {
    primary: 'studio-button-primary',
    secondary: 'studio-button-secondary',
    outline: 'border-2 border-sand text-brand hover:border-bloom hover:text-accent',
    ghost: 'text-accent hover:bg-blush/30',
    blush: 'bg-blush text-brand hover:bg-petal',
  }

  const sizes = {
    sm: 'px-4 py-2 text-sm',
    md: 'px-5 py-2.5 text-sm sm:text-base',
    lg: 'px-6 py-3 text-base',
  }

  const classes = `${baseClasses} ${variants[variant] ?? variants.primary} ${sizes[size]} ${className}`

  if (Component === 'button') {
    return (
      <button className={classes} {...props}>
        {children}
      </button>
    )
  }

  // Polymorphic: render as the provided component (e.g. Next.js Link)
  return (
    <Component href={href} className={classes} {...props}>
      {children}
      <PendingLinkIndicator />
    </Component>
  )
}

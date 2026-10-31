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
  const baseClasses = 'inline-flex items-center justify-center gap-2 rounded-full font-semibold tracking-wide transition duration-300 ease-out disabled:pointer-events-none disabled:opacity-50'

  const variants = {
    primary: 'bg-plum text-cream shadow-soft hover:bg-ink hover:-translate-y-0.5 hover:shadow-lift active:translate-y-0',
    secondary: 'bg-ivory text-plum ring-1 ring-blush/80 hover:bg-blush/60 hover:-translate-y-0.5',
    outline: 'border-2 border-sand text-plum hover:border-bloom hover:text-bloom',
    ghost: 'text-bloom hover:bg-blush/30',
    blush: 'bg-blush text-plum hover:bg-petal/70 hover:-translate-y-0.5',
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
    </Component>
  )
}

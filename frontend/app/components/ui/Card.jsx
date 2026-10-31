/**
 * Card Component - Unified card styles
 */
export default function Card({
  children,
  hoverable = false,
  className = '',
  ...props
}) {
  const baseClasses = 'paper-card rounded-3xl border border-sand/80 bg-ivory/80 shadow-soft'
  const hoverClasses = hoverable ? 'transition duration-300 ease-out hover:-translate-y-1 hover:shadow-lift' : ''

  return (
    <div
      className={`${baseClasses} ${hoverClasses} ${className}`}
      {...props}
    >
      {children}
    </div>
  )
}

/**
 * Card Component - Unified card styles
 */
export default function Card({
  children,
  hoverable = false,
  className = '',
  ...props
}) {
  const baseClasses = 'paper-card'
  const hoverClasses = hoverable ? 'transition-colors duration-200' : ''

  return (
    <div
      className={`${baseClasses} ${hoverClasses} ${className}`}
      {...props}
    >
      {children}
    </div>
  )
}

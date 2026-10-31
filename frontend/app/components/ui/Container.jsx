/**
 * Container Component - Unified container/layout wrapper
 */
export default function Container({
  children,
  className = '',
  ...props
}) {
  return (
    <div
      className={`container-page mx-auto w-full max-w-6xl px-4 sm:px-6 lg:px-8 ${className}`}
      {...props}
    >
      {children}
    </div>
  )
}

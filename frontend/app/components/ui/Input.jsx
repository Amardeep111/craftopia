import { useId } from 'react'

/**
 * Input Component - Unified input styles
 */
export default function Input({
  label,
  error,
  className = '',
  id,
  ...props
}) {
  const generatedId = useId()
  const inputId = id || generatedId
  const baseClasses = 'w-full rounded-2xl border bg-cream px-4 py-3 outline-none transition focus:ring-2 focus:ring-bloom/30'
  const errorClasses = error ? 'border-bloom' : 'border-sand'

  return (
    <div className="space-y-2">
      {label && (
        <label htmlFor={inputId} className="block text-sm font-medium text-plum">
          {label}
        </label>
      )}
      <input
        id={inputId}
        className={`${baseClasses} ${errorClasses} ${className}`}
        {...props}
      />
      {error && (
        <p className="text-sm text-bloom">{error}</p>
      )}
    </div>
  )
}

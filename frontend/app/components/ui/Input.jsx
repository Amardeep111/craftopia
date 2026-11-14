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
  const baseClasses = 'studio-input w-full rounded-lg border px-4 py-3 outline-none transition focus:ring-2 focus:ring-bloom/30'
  const errorClasses = error ? 'border-bloom' : 'border-sand'

  return (
    <div className="space-y-2">
      {label && (
        <label htmlFor={inputId} className="block text-sm font-medium text-brand">
          {label}
        </label>
      )}
      <input
        id={inputId}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${inputId}-error` : undefined}
        className={`${baseClasses} ${errorClasses} ${className}`}
        {...props}
      />
      {error && (
        <p id={`${inputId}-error`} className="text-sm text-accent">{error}</p>
      )}
    </div>
  )
}

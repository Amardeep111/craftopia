'use client'

import { useState, useRef, useEffect } from 'react'
import { ChevronDown, Check } from 'lucide-react'

/**
 * Custom dropdown / select component.
 * - Consistent styling across all devices (not native HTML)
 * - Keyboard accessible
 * - Search/filter for long lists
 * - Works with mouse and touch
 */
export default function Select({
  label,
  options = [],
  value,
  onChange,
  placeholder = 'Select an option',
  error,
  required,
  disabled,
  searchPlaceholder = 'Search...',
  showSearch = false,
}) {
  const [isOpen, setIsOpen] = useState(false)
  const [search, setSearch] = useState('')
  const containerRef = useRef(null)
  const inputRef = useRef(null)

  const filteredOptions = showSearch && search
    ? options.filter(opt =>
        opt.label.toLowerCase().includes(search.toLowerCase()) ||
        opt.value?.toLowerCase().includes(search.toLowerCase())
      )
    : options

  const selectedOption = options.find(opt => opt.value === value)

  useEffect(() => {
    function handleClickOutside(event) {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false)
        setSearch('')
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  useEffect(() => {
    if (isOpen && showSearch && inputRef.current) {
      inputRef.current.focus()
    }
  }, [isOpen, showSearch])

  function handleSelect(option) {
    onChange(option.value)
    setIsOpen(false)
    setSearch('')
  }

  function handleKeyDown(e) {
    if (e.key === 'Escape') {
      setIsOpen(false)
      setSearch('')
    } else if (e.key === 'ArrowDown' && !isOpen) {
      e.preventDefault()
      setIsOpen(true)
    }
  }

  return (
    <div ref={containerRef} className="relative">
      {label && (
        <label className="block text-sm font-semibold text-plum mb-1.5">
          {label}
          {required && <span className="text-bloom ml-0.5">*</span>}
        </label>
      )}

      <button
        type="button"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        onKeyDown={handleKeyDown}
        disabled={disabled}
        className={[
          'w-full flex items-center justify-between px-4 py-2.5 rounded-full',
          'text-left font-medium transition-all duration-150',
          'border-2 bg-white',
          error
            ? 'border-bloom/60 focus:border-bloom'
            : 'border-sand focus:border-plum',
          disabled
            ? 'opacity-50 cursor-not-allowed bg-ivory'
            : 'cursor-pointer hover:border-plum/40',
          isOpen ? 'border-plum ring-2 ring-plum/10' : '',
        ].join(' ')}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-labelledby={label}
      >
        <span className={selectedOption ? 'text-plum' : 'text-muted'}>
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <ChevronDown
          className={[
            'h-4 w-4 text-muted transition-transform duration-150 shrink-0',
            isOpen && 'rotate-180',
          ].join(' ')}
        />
      </button>

      {isOpen && (
        <div
          className={[
            'absolute z-50 w-full mt-2 py-2 bg-white rounded-2xl border-2 border-sand',
            'shadow-lg max-h-64 overflow-hidden',
          ].join(' ')}
          role="listbox"
        >
          {showSearch && (
            <div className="px-3 pb-2 border-b border-sand/50">
              <input
                ref={inputRef}
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={searchPlaceholder}
                className="w-full px-3 py-2 text-sm border border-sand rounded-full focus:outline-none focus:border-plum"
              />
            </div>
          )}

          <div className="overflow-y-auto max-h-44">
            {filteredOptions.length === 0 ? (
              <div className="px-4 py-3 text-sm text-muted text-center">
                No options found
              </div>
            ) : (
              filteredOptions.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => handleSelect(option)}
                  className={[
                    'w-full flex items-center justify-between px-4 py-2.5 text-left',
                    'text-sm transition-colors',
                    option.value === value
                      ? 'bg-plum/10 text-plum'
                      : 'text-plum hover:bg-ivory',
                  ].join(' ')}
                  role="option"
                  aria-selected={option.value === value}
                >
                  <span>{option.label}</span>
                  {option.value === value && (
                    <Check className="h-4 w-4 text-plum" />
                  )}
                </button>
              ))
            )}
          </div>
        </div>
      )}

      {error && (
        <p className="mt-1.5 text-xs text-bloom font-medium">{error}</p>
      )}
    </div>
  )
}
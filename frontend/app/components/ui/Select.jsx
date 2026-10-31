'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { ChevronDown, Check } from 'lucide-react'

export default function Select({
  value,
  onChange,
  options = [],
  placeholder = 'Select...',
  className = '',
  disabled = false,
  error = false,
}) {
  const [open, setOpen] = useState(false)
  const [focusedIndex, setFocusedIndex] = useState(-1)
  const [pos, setPos] = useState({ side: 'bottom', align: 'left' })
  const ref = useRef(null)
  const triggerRef = useRef(null)

  const selectedOption = options.find((o) => o.value === value) || null
  const selectedLabel = selectedOption ? selectedOption.label : placeholder

  const handleSelect = useCallback(
    (optValue) => {
      onChange?.(optValue)
      setOpen(false)
      setFocusedIndex(-1)
      triggerRef.current?.focus()
    },
    [onChange],
  )

  useEffect(() => {
    function handleClickOutside(e) {
      if (ref.current && !ref.current.contains(e.target)) {
        setOpen(false)
        setFocusedIndex(-1)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  useEffect(() => {
    if (!open) {
      setFocusedIndex(-1)
      return
    }
    const idx = options.findIndex((o) => o.value === value)
    setFocusedIndex(idx >= 0 ? idx : 0)
  }, [open, options, value])

  useEffect(() => {
    if (!open || !triggerRef.current) return
    const rect = triggerRef.current.getBoundingClientRect()
    const vw = window.innerWidth
    let align = 'left'
    let side = 'bottom'
    if (rect.right + 240 > vw) align = 'right'
    if (rect.bottom + 300 > window.innerHeight) side = 'top'
    setPos({ side, align })
  }, [open])

  const handleKeyDown = (e) => {
    if (disabled) return
    if (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowDown') {
      e.preventDefault()
      if (!open) {
        setOpen(true)
      } else {
        const next = Math.min(focusedIndex + 1, options.length - 1)
        setFocusedIndex(next)
      }
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      if (open) {
        const prev = Math.max(focusedIndex - 1, 0)
        setFocusedIndex(prev)
      }
    } else if (e.key === 'Escape') {
      e.preventDefault()
      setOpen(false)
      setFocusedIndex(-1)
      triggerRef.current?.focus()
    } else if (e.key === 'Tab') {
      setOpen(false)
    }
  }

  return (
    <div
      ref={ref}
      className={`relative ${className}`}
      role="combobox"
      aria-expanded={open}
      aria-haspopup="listbox"
      aria-controls="custom-select-list"
      aria-activedescendant={open && focusedIndex >= 0 ? `option-${focusedIndex}` : undefined}
    >
      <button
        ref={triggerRef}
        type="button"
        onClick={() => !disabled && setOpen((v) => !v)}
        onKeyDown={handleKeyDown}
        disabled={disabled}
        aria-label={selectedLabel}
        className={`
          flex w-full items-center justify-between gap-3
          rounded-2xl border bg-ivory px-4 py-2.5 text-sm text-ink
          transition duration-200 ease-out outline-none
          hover:border-blush focus:border-bloom focus:ring-2 focus:ring-bloom/20
          ${error ? 'border-bloom' : 'border-sand/80'}
          ${disabled ? 'cursor-not-allowed opacity-50' : ''}
        `}
      >
        <span className="truncate">{selectedLabel}</span>
        <ChevronDown
          className={`h-4 w-4 shrink-0 text-muted transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
          aria-hidden="true"
        />
      </button>

      {open && (
        <div
          id="custom-select-list"
          role="listbox"
          aria-label="Options"
          className={`
            absolute z-50 w-full max-h-[18rem] overflow-y-auto overflow-x-hidden rounded-2xl border border-sand/60 bg-ivory
            py-2 shadow-[0_10px_30px_-12px_rgb(90_61_74_/0.2)] transition-all duration-200 ease-out
            ${pos.side === 'top' ? 'bottom-full mb-2' : 'top-full mt-2'}
            ${pos.align === 'right' ? 'left-auto right-0' : ''}
          `}
          style={{ animation: 'fadeIn 0.15s ease-out' }}
        >
          {options.map((opt, i) => (
            <button
              key={opt.value}
              id={`option-${i}`}
              role="option"
              aria-selected={value === opt.value}
              type="button"
              onClick={() => handleSelect(opt.value)}
              onMouseEnter={() => setFocusedIndex(i)}
              className={`
                flex w-full items-center justify-between gap-2 px-4 py-2.5 text-sm transition duration-150
                text-ink hover:bg-blush/40
                ${value === opt.value ? 'bg-blush/30 font-semibold text-plum' : ''}
                ${focusedIndex === i && value !== opt.value ? 'bg-blush/20' : ''}
                ${focusedIndex === i ? 'outline-none' : ''}
                ${i === 0 ? 'rounded-t-xl' : ''}
                ${i === options.length - 1 ? 'rounded-b-xl' : ''}
              `}
            >
              <span className="truncate">{opt.label}</span>
              {value === opt.value && (
                <Check className="h-3.5 w-3.5 shrink-0 text-bloom" aria-hidden="true" />
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

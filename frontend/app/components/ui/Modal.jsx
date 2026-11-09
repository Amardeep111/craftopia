'use client'

import { useEffect } from 'react'
import { X } from 'lucide-react'
import { useLockBody } from '@/hooks/useScrolled'
import { cn } from '@/lib/cn'

export default function Modal({ open, title, onClose, maxWidth = 'max-w-md', className = '', children }) {
  useLockBody(open)

  useEffect(() => {
    if (!open) return undefined
    const onKey = (e) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-3 sm:p-4">
      <button
        type="button"
        className="fixed inset-0 bg-plum/40 backdrop-blur-[3px] transition-opacity"
        aria-label="Close dialog"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
        className={cn(
          'relative z-10 w-full max-h-[90vh] flex flex-col rounded-3xl bg-cream p-5 sm:p-7 shadow-lift',
          maxWidth,
          className
        )}
      >
        <div className="flex shrink-0 items-start justify-between gap-4 border-b border-sand/50 pb-3">
          <h2 id="modal-title" className="font-display text-xl sm:text-2xl text-plum">
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-1.5 text-plum/70 hover:text-plum hover:bg-ivory transition"
            aria-label="Close dialog"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="mt-4 flex-1 min-h-0 overflow-y-auto pr-1">{children}</div>
      </div>
    </div>
  )
}

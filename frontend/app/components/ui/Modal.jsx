'use client'

import { useEffect } from 'react'
import { X } from 'lucide-react'
import { useLockBody } from '@/hooks/useScrolled'

export default function Modal({ open, title, onClose, children }) {
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
    <div className="fixed inset-0 z-[80] flex items-end justify-center p-4 sm:items-center">
      <button
        type="button"
        className="absolute inset-0 bg-plum/30 backdrop-blur-[2px]"
        aria-label="Close dialog"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
        className="relative z-10 w-full max-w-md rounded-3xl bg-cream p-6 shadow-lift sm:p-8"
      >
        <div className="flex items-start justify-between gap-4">
          <h2 id="modal-title" className="font-display text-2xl text-plum">
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-2 text-plum transition hover:bg-ivory"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="mt-4">{children}</div>
      </div>
    </div>
  )
}
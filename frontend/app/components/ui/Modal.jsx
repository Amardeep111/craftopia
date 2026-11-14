'use client'

import { useId, useRef } from 'react'
import { X, MoveDiagonal2 } from 'lucide-react'
import { useLockBody } from '@/hooks/useScrolled'
import { useDialogFocus } from '@/hooks/useDialogFocus'
import { cn } from '@/lib/cn'

export default function Modal({ open, title, description, onClose, dismissible = true, maxWidth = 'max-w-md', className = '', resizable = false, children }) {
  useLockBody(open)
  const dialogRef = useRef(null)
  const resizeRef = useRef(null)
  const titleId = useId()
  const descriptionId = `${titleId}-description`
  useDialogFocus(open, dialogRef, onClose, dismissible)
  const resize = (width, height) => {
    const dialog = dialogRef.current
    if (!dialog) return
    dialog.style.width = `${Math.max(Math.min(420, window.innerWidth - 32), Math.min(width, window.innerWidth - 32))}px`
    dialog.style.height = `${Math.max(Math.min(320, window.innerHeight - 32), Math.min(height, window.innerHeight - 32))}px`
    dialog.style.maxWidth = 'calc(100vw - 32px)'
  }
  const finishResize = () => {
    resizeRef.current = null
    dialogRef.current?.classList.remove('studio-dialog-resizing')
  }
  if (!open) return null
  return <div className={cn('studio-dialog-overlay', resizable && 'studio-dialog-overlay-resizable')}>
    <div className="studio-dialog-backdrop" aria-hidden="true" onClick={() => { if (dismissible) onClose() }} />
    <div ref={dialogRef} role="dialog" tabIndex={-1} aria-modal="true" aria-labelledby={titleId} aria-describedby={description ? descriptionId : undefined} className={cn('studio-dialog', maxWidth, resizable && 'studio-dialog-resizable', className)}>
      <div className="studio-dialog-header">
        <div><h2 id={titleId}>{title}</h2>{description && <p id={descriptionId}>{description}</p>}</div>
        <button type="button" onClick={onClose} disabled={!dismissible} className="studio-dialog-close" aria-label="Close dialog"><X className="h-5 w-5" aria-hidden="true" /></button>
      </div>
      <div className="studio-dialog-body">{children}</div>
      {resizable && <button
        type="button"
        className="studio-dialog-resize-handle"
        aria-label="Resize editor"
        title="Drag to resize. Use arrow keys when focused."
        onPointerDown={(event) => {
          if (event.button !== 0) return
          event.preventDefault()
          const rect = dialogRef.current.getBoundingClientRect()
          resizeRef.current = { x: event.clientX, y: event.clientY, width: rect.width, height: rect.height }
          event.currentTarget.setPointerCapture(event.pointerId)
          event.currentTarget.focus({ preventScroll: true })
          dialogRef.current.classList.add('studio-dialog-resizing')
        }}
        onPointerMove={(event) => {
          const start = resizeRef.current
          // The dialog stays centered, so each edge moves half the size change.
          if (start) resize(start.width + 2 * (event.clientX - start.x), start.height + 2 * (event.clientY - start.y))
        }}
        onPointerUp={finishResize}
        onPointerCancel={finishResize}
        onLostPointerCapture={finishResize}
        onKeyDown={(event) => {
          if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.key)) return
          event.preventDefault()
          const rect = dialogRef.current.getBoundingClientRect()
          resize(rect.width + (event.key === 'ArrowRight' ? 24 : event.key === 'ArrowLeft' ? -24 : 0), rect.height + (event.key === 'ArrowDown' ? 24 : event.key === 'ArrowUp' ? -24 : 0))
        }}
      ><MoveDiagonal2 className="h-4 w-4" aria-hidden="true" /></button>}
    </div>
  </div>
}

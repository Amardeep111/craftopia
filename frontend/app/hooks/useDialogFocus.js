'use client'

import { useEffect, useRef } from 'react'

export function useDialogFocus(open, dialogRef, onClose, dismissible = true) {
  const closeRef = useRef(onClose)
  const dismissibleRef = useRef(dismissible)
  closeRef.current = onClose
  dismissibleRef.current = dismissible
  useEffect(() => {
    if (!open || !dialogRef.current) return
    const previous = document.activeElement
    const dialog = dialogRef.current
    const controls = () => [...dialog.querySelectorAll('a[href],button,input,select,textarea,[tabindex]')].filter((element) => !element.disabled && element.tabIndex >= 0 && element.getClientRects().length)
    const initialControl = controls()[0] || dialog
    initialControl.focus({ preventScroll: true })
    const onKey = (event) => {
      const dialogs = document.querySelectorAll('[role="dialog"][aria-modal="true"]')
      if (dialogs[dialogs.length - 1] !== dialog) return
      if (event.key === 'Escape' && dismissibleRef.current) {
        event.preventDefault()
        event.stopPropagation()
        closeRef.current?.()
      }
      if (event.key !== 'Tab') return
      const items = controls()
      const first = items[0]
      const last = items[items.length - 1]
      if (!first) { event.preventDefault(); dialog.focus(); return }
      if (event.shiftKey && (document.activeElement === first || !dialog.contains(document.activeElement))) { event.preventDefault(); last.focus() }
      else if (!event.shiftKey && (document.activeElement === last || !dialog.contains(document.activeElement))) { event.preventDefault(); first.focus() }
    }
    document.addEventListener('keydown', onKey)
    return () => { document.removeEventListener('keydown', onKey); if (previous?.isConnected) previous.focus({ preventScroll: true }) }
  }, [open, dialogRef])
}

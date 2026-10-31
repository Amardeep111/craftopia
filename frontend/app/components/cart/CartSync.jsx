'use client'

import { useEffect, useRef } from 'react'
import { useCartStore } from '@/lib/cart'
import { useUserStore } from '@/lib/user'
import { fetchCurrentUser } from '@/lib/auth/client'

function mergeCartItems(savedItems, guestItems) {
  const merged = new Map(savedItems.map((item) => [item.id, { ...item }]))
  for (const item of guestItems) {
    const current = merged.get(item.id)
    if (current) {
      current.quantity = Math.min(99, Number(current.quantity || 0) + Number(item.quantity || 0))
      if (!current.image && item.image) current.image = item.image
      if (!current.imageUrl && item.imageUrl) current.imageUrl = item.imageUrl
      if (!current.visual && item.visual) current.visual = item.visual
    } else {
      merged.set(item.id, { ...item, quantity: Math.min(99, Number(item.quantity || 1)) })
    }
  }
  return [...merged.values()]
}

export default function CartSync() {
  const userId = useUserStore((state) => state.userId)
  const readyUserId = useRef(null)
  const initializedUserId = useRef(null)

  useEffect(() => {
    let alive = true
    fetchCurrentUser().then((auth) => {
      if (!alive) return
      if (!auth.authenticated || !auth.user) {
        if (useUserStore.getState().userId) {
          useUserStore.getState().logout()
          useCartStore.getState().replaceItems([])
          useCartStore.getState().setOwnerUserId(null)
        }
        return
      }
      if (auth.user?.userId) {
        useUserStore.getState().login({ ...auth.user, userId: auth.user.userId })
      }
    }).catch(() => {})
    return () => { alive = false }
  }, [])

  useEffect(() => {
    let active = true
    if (!userId) {
      readyUserId.current = null
      // Only wipe cart if user explicitly logged out (session invalid), not on navigation
      if (initializedUserId.current && !useUserStore.getState().userId) {
        useCartStore.getState().replaceItems([])
        useCartStore.getState().setOwnerUserId(null)
        initializedUserId.current = null
      }
      return () => { active = false }
    }

    readyUserId.current = null

    async function initialize() {
      try {
        const response = await fetch('/api/cart', { cache: 'no-store' })
        const result = await response.json()
        if (!response.ok || !result.success) throw new Error(result.error || 'Saved cart unavailable')
        if (!active) return

        const serverItems = Array.isArray(result.data) ? result.data : []
        const currentLocal = useCartStore.getState().items || []
        // Merge server cart and local cart so any newly added items (like Buy Now) are never wiped out
        const items = mergeCartItems(serverItems, currentLocal)

        useCartStore.getState().replaceItems(items)
        useCartStore.getState().setOwnerUserId(userId)
        initializedUserId.current = userId
        readyUserId.current = userId

        // If local had items not yet in server cart, sync them immediately to server
        if (items.length > 0 && (items.length !== serverItems.length || JSON.stringify(items) !== JSON.stringify(serverItems))) {
          fetch('/api/cart', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ items: items.map((item) => ({ productId: item.id, quantity: item.quantity })) }),
          }).catch(() => {})
        }
      } catch {
        // Keep the local cart usable if the saved-cart service is temporarily unavailable.
      }
    }
    initialize()
    return () => { active = false }
  }, [userId])

  useEffect(() => {
    let timer
    const unsubscribe = useCartStore.subscribe((state, previous) => {
      const owner = readyUserId.current
      if (!owner || state.items === previous.items) return
      clearTimeout(timer)
      const items = state.items.map(({ id, quantity }) => ({ productId: id, quantity }))
      timer = setTimeout(() => {
        if (readyUserId.current !== owner) return
        fetch('/api/cart', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ items }) }).catch(() => {})
      }, 350)
    })
    return () => { clearTimeout(timer); unsubscribe() }
  }, [])

  return null
}

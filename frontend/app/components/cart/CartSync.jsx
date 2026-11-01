'use client'

import { useEffect, useRef } from 'react'
import { useCartStore } from '@/lib/cart'
import { useUserStore } from '@/lib/user'

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

function normalizeCartItems(items) {
  if (!Array.isArray(items)) return []

  return items.flatMap((item) => {
    const product = item?.product || item || {}
    const id = item?.productId || product.id || item?.id
    if (typeof id !== 'string' || !id) return []

    const numberOr = (value, fallback = 0) => {
      const number = Number(value)
      return Number.isFinite(number) ? number : fallback
    }
    const rawQuantity = Number(item?.quantity)
    const quantity = Number.isFinite(rawQuantity) && rawQuantity > 0
      ? Math.min(99, Math.trunc(rawQuantity))
      : 1
    const price = numberOr(item?.price, numberOr(product.price))
    const imageUrl = item?.imageUrl || item?.image || product.imageUrl || product.image || ''
    const images = item?.images || product.images
    const image = item?.image || item?.imageUrl || product.image || product.imageUrl || (Array.isArray(images) ? images[0] : '')

    return [{
      ...product,
      ...item,
      id,
      name: item?.name || product.name || 'Handmade product',
      price,
      originalPrice: numberOr(item?.originalPrice, price),
      discountPercent: numberOr(item?.discountPercent, numberOr(product.discountPercent)),
      gstPercent: numberOr(item?.gstPercent, numberOr(product.gstPercent)),
      codFee: numberOr(item?.codFee, numberOr(product.codFee)),
      otherCharge: numberOr(item?.otherCharge, numberOr(product.otherCharge)),
      image,
      imageUrl,
      visual: item?.visual || product.visual || image,
      quantity,
    }]
  })
}

export default function CartSync({ initialUser = null, initialCart = null }) {
  const userId = useUserStore((state) => state.userId)
  const readyUserId = useRef(null)
  const initializedUserId = useRef(null)

  useEffect(() => {
    const userStore = useUserStore.getState()
    if (initialUser?.userId) {
      userStore.login(initialUser)
    } else if (userStore.userId) {
      userStore.logout()
      useCartStore.getState().replaceItems([])
      useCartStore.getState().setOwnerUserId(null)
    }
  }, [initialUser])

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
        let serverItems
        if (initialUser?.userId === userId && Array.isArray(initialCart)) {
          serverItems = initialCart
        } else {
          const response = await fetch('/api/cart', { cache: 'no-store' })
          const result = await response.json()
          if (!response.ok || !result.success) throw new Error(result.error || 'Saved cart unavailable')
          serverItems = Array.isArray(result.data) ? result.data : []
        }
        if (!active) return

        const currentLocal = useCartStore.getState().items || []
        // Merge server cart and local cart so any newly added items (like Buy Now) are never wiped out
        const items = mergeCartItems(normalizeCartItems(serverItems), normalizeCartItems(currentLocal))

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
  }, [userId, initialUser, initialCart])

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

'use client'

import { useEffect, useState } from 'react'

let cache = { fetchedAt: 0, discounts: {} }
let pendingRequest

function loadPromotions() {
  if (Date.now() - cache.fetchedAt < 30_000) return Promise.resolve(cache.discounts)
  if (!pendingRequest) {
    pendingRequest = fetch('/api/promotions', { cache: 'no-store' })
      .then((response) => response.json())
      .then((result) => {
        if (!result.success) throw new Error('Promotions unavailable')
        cache = { fetchedAt: Date.now(), discounts: Object.fromEntries(result.data.map((p) => [p.id, p])) }
        return cache.discounts
      })
      .catch(() => cache.discounts)
      .finally(() => { pendingRequest = undefined })
  }
  return pendingRequest
}

export function useProductPricing(productId) {
  const [pricing, setPricing] = useState(() => cache.discounts[productId] || {})
  useEffect(() => {
    let active = true
    loadPromotions().then((discounts) => { if (active) setPricing(discounts[productId] || {}) })
    return () => { active = false }
  }, [productId])
  return { discountPercent: 0, gstPercent: 0, codFee: 0, otherCharge: 0, ...pricing }
}

export function useProductDiscount(productId) {
  return useProductPricing(productId).discountPercent
}

export function discountedPrice(price, discountPercent) {
  return Math.round(Number(price) * (100 - (Number(discountPercent) || 0)) / 100)
}

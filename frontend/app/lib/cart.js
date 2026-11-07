/**
 * Cart store backed by localStorage.
 * Keeps the full cart state here so Navbar, product pages, and the cart page all share the same source of truth.
 * Supports direct single-product checkout (Buy Now) without polluting or clearing the persistent cart.
 */
import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export const CART_EVENT = 'jamaes:cart:change'

function notifyChange() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event(CART_EVENT))
  }
}

function normalizeCartItem(product, quantity = 1) {
  return {
    id: product.id,
    name: product.name,
    price: product.price,
    originalPrice: product.originalPrice ?? product.price,
    discountPercent: product.discountPercent || 0,
    gstPercent: product.gstPercent || 0,
    codFee: product.codFee || 0,
    otherCharge: product.otherCharge || 0,
    allowedPaymentMethods: product.allowedPaymentMethods || ['upi'],
    visual: product.visual || product.image || product.imageUrl || (Array.isArray(product.images) && product.images[0]) || '',
    imageUrl: product.imageUrl || product.image || (Array.isArray(product.images) && product.images[0]) || '',
    image: product.image || product.imageUrl || (Array.isArray(product.images) && product.images[0]) || '',
    palette: product.palette,
    category: product.category,
    quantity: Math.min(99, Math.max(1, quantity)),
  }
}

export const useCartStore = create(
  persist(
    (set, get) => ({
      items: [],
      buyNowItem: null,
      checkoutMode: 'cart', // 'cart' | 'buynow'
      ownerUserId: null,

      replaceItems(items) {
        set({ items: Array.isArray(items) ? items : [] })
        notifyChange()
      },

      setOwnerUserId(ownerUserId) {
        set({ ownerUserId: ownerUserId || null })
      },

      setBuyNow(product, quantity = 1) {
        const item = normalizeCartItem(product, quantity)
        set({ buyNowItem: [item], checkoutMode: 'buynow' })
        notifyChange()
      },

      clearBuyNow() {
        set({ buyNowItem: null, checkoutMode: 'cart' })
        notifyChange()
      },

      addItem(product, quantity = 1) {
        const items = get().items
        const key = product.id
        const existing = items.find((i) => i.id === key)
        if (existing) {
          set({
            items: items.map((i) =>
              i.id === key ? { ...i, quantity: Math.min(99, i.quantity + quantity) } : i
            ),
          })
        } else {
          set({
            items: [...items, normalizeCartItem(product, quantity)],
          })
        }
        notifyChange()
      },

      removeItem(id) {
        if (get().checkoutMode === 'buynow') {
          set({ buyNowItem: null, checkoutMode: 'cart' })
        } else {
          set({ items: get().items.filter((i) => i.id !== id) })
        }
        notifyChange()
      },

      updateQuantity(id, quantity) {
        if (quantity < 1) {
          get().removeItem(id)
          return
        }
        if (get().checkoutMode === 'buynow') {
          set({
            buyNowItem: (get().buyNowItem || []).map((i) =>
              i.id === id ? { ...i, quantity: Math.min(99, quantity) } : i
            ),
          })
        } else {
          set({
            items: get().items.map((i) =>
              i.id === id ? { ...i, quantity: Math.min(99, quantity) } : i
            ),
          })
        }
        notifyChange()
      },

      updateItemPrices(validatedItems) {
        const detailsById = new Map(validatedItems.map((item) => [item.productId, item]))
        const updater = (item) => {
          const current = detailsById.get(item.id)
          return current
            ? {
                ...item,
                price: current.unitPrice,
                originalPrice: current.originalPrice,
                discountPercent: current.discountPercent,
                gstPercent: current.gstPercent,
                gstAmount: current.gstAmount,
                codFee: current.codFee,
                otherCharge: current.otherCharge,
                allowedPaymentMethods: current.allowedPaymentMethods || ['upi'],
              }
            : item
        }
        set({
          items: get().items.map(updater),
          buyNowItem: get().buyNowItem ? get().buyNowItem.map(updater) : null,
        })
        notifyChange()
      },

      clear() {
        if (get().checkoutMode === 'buynow') {
          set({ buyNowItem: null, checkoutMode: 'cart' })
        } else {
          set({ items: [] })
        }
        notifyChange()
      },

      clearCheckout() {
        if (get().checkoutMode === 'buynow') {
          set({ buyNowItem: null, checkoutMode: 'cart' })
        } else {
          set({ items: [] })
        }
        notifyChange()
      },

      totalItems() {
        return get().items.reduce((sum, i) => sum + i.quantity, 0)
      },

      totalPrice() {
        return get().items.reduce((sum, i) => sum + i.price * i.quantity, 0)
      },
    }),
    {
      name: 'jamaes:cart',
    }
  )
)

export function useCheckoutItems() {
  return useCartStore((s) =>
    s.checkoutMode === 'buynow' && Array.isArray(s.buyNowItem) && s.buyNowItem.length > 0
      ? s.buyNowItem
      : s.items
  )
}

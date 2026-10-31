/**
 * Coupon store — single source of truth across cart, order summary, and payment.
 *
 * Backed by zustand + persist using the same storage key OrderSummary already
 * reads from (`jamaes:coupon`), so any previously-applied coupon survives a
 * reload and every checkout step sees the same discount.
 *
 * The coupon itself is { code, discount, label, minSubtotal }. Discount is a
 * fraction of the subtotal (e.g. 0.1 = 10%). The actual discount amount is
 * computed from the live subtotal in the pricing layer, never stored here.
 *
 * A coupon only stays applied while the cart subtotal is >= its minSubtotal.
 * Call `revalidate(subtotal)` whenever the cart changes; if the subtotal has
 * dropped below the minimum the coupon is removed and an error is surfaced.
 */
import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export const COUPON_STORAGE_KEY = 'jamaes:coupon'

export const DEMO_COUPONS = {}

export const useCouponStore = create(
  persist(
    (set, get) => ({
      coupon: null,
      loading: false,
      error: '',

      async apply(code, subtotal) {
        const c = (code || '').trim().toUpperCase()
        if (!c) {
          set({ error: 'Please enter a coupon code.' })
          return false
        }
        set({ loading: true, error: '' })
        try {
          const response = await fetch('/api/coupons/validate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ code: c, subtotal }),
          })
          const result = await response.json()
          if (!response.ok || !result.success) throw new Error(result.error || "That coupon code isn't valid.")
          const applied = result.data
          // The server already enforces minSubtotal for the subtotal it was
          // given, but re-check here so a stale/incorrect subtotal can never
          // leave an invalid coupon applied.
          if (!couponMeetsMinSubtotal(applied, subtotal)) {
            set({ coupon: null, error: minSubtotalError(applied), loading: false })
            return false
          }
          set({ coupon: applied, error: '', loading: false })
          return true
        } catch (error) {
          set({ error: error.message || 'Could not validate this coupon.', loading: false })
          return false
        }
      },

      /**
       * Re-check an already-applied coupon against a (new) subtotal.
       * Returns true when the coupon stays applied, false when it was
       * invalidated and removed because the subtotal fell below minSubtotal.
       */
      revalidate(subtotal) {
        const { coupon } = get()
        if (!coupon) return true
        if (couponMeetsMinSubtotal(coupon, subtotal)) {
          // Still valid — clear any stale min-subtotal error.
          if (get().error) set({ error: '' })
          return true
        }
        set({ coupon: null, error: minSubtotalError(coupon), loading: false })
        return false
      },

      remove() {
        set({ coupon: null, error: '' })
      },

      clear() {
        set({ coupon: null, error: '', loading: false })
      },
    }),
    {
      name: COUPON_STORAGE_KEY,
    }
  )
)

function couponMeetsMinSubtotal(coupon, subtotal) {
  const min = coupon && (coupon.minSubtotal != null) ? Number(coupon.minSubtotal) : 0
  return Number(subtotal) >= min
}

function minSubtotalError(coupon) {
  const min = coupon && (coupon.minSubtotal != null) ? coupon.minSubtotal : 0
  return `This coupon requires a minimum cart of ₹${min}.`
}

export function couponDiscountAmount(coupon, subtotal) {
  if (!coupon || !subtotal) return 0
  return Math.round(subtotal * coupon.discount)
}

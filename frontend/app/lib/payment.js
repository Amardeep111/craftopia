/**
 * Payment helpers — validation, formatting, method metadata, coupon storage.
 *
 * Pure module: no React hooks, no browser-only APIs at module scope. Safe to
 * import from both client and server bundles.
 *
 * Design intent: keep all provider-specific business logic out of the UI.
 * The UI only ever talks to the PaymentService (client hook), which talks to
 * our own API routes, which dispatch to a pluggable payment provider.
 */
'use client'

// ─── Payment method metadata ──────────────────────────────────────────────
// Icon names reference lucide-react components (the icon system already used
// throughout Jamae's Craftopia). Kept small and neutral — no fintech branding.

export const PAYMENT_METHODS = {
  upi: {
    id: 'upi',
    label: 'UPI',
    description: 'Pay using any UPI app',
    icon: 'Smartphone',
  },
  cod: {
    id: 'cod',
    label: 'Cash on Delivery',
    description: 'Pay when delivered',
    icon: 'Truck',
  },
}

export const PAYMENT_METHOD_ORDER = ['upi', 'cod']

// Human-readable label for the test-mode banner shown inside the payment form.
export const TEST_MODE_LABEL = 'Test mode — no real money is moved'

// ─── Coupon storage ───────────────────────────────────────────────────────
// Shared key with OrderSummary. A coupon applied on the cart page is
// persisted here so every checkout step reads the same discount.

export const COUPON_STORAGE_KEY = 'jamaes:coupon'

export function readCoupon() {
  if (typeof window === 'undefined') return null
  try {
    const raw = window.localStorage.getItem(COUPON_STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    if (parsed && typeof parsed.discount === 'number' && parsed.code) return parsed
  } catch {
    /* ignore corrupt storage */
  }
  return null
}

export function writeCoupon(coupon) {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(COUPON_STORAGE_KEY, JSON.stringify(coupon))
    window.dispatchEvent(new Event('storage'))
  } catch {
    /* ignore */
  }
}

export function removeCoupon() {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.removeItem(COUPON_STORAGE_KEY)
    window.dispatchEvent(new Event('storage'))
  } catch {
    /* ignore */
  }
}

// ─── UPI / VPA validation ────────────────────────────────────────────────
// UPI VPA format: local-part@bank-part. Local part 2–99 chars, bank part
// 2–40 chars. Alphanumerics plus . _ - are allowed.

const UPI_RE = /^[a-zA-Z0-9._-]{2,99}@[a-zA-Z0-9]{2,40}$/

export function validateUpiId(vpa) {
  const v = (vpa || '').trim()
  if (!v) return 'Please enter your UPI ID / VPA.'
  if (!UPI_RE.test(v)) return 'Enter a valid UPI ID, e.g. name@upi'
  if (v.split('@')[0].length < 2) return 'UPI ID needs at least 2 characters before @'
  return ''
}

// ─── Card validation ─────────────────────────────────────────────────────

export function stripCardDigits(v) {
  return (v || '').replace(/\D/g, '')
}

export function formatCardNumber(raw) {
  return stripCardDigits(raw).slice(0, 19).replace(/(.{4})/g, '$1 ').trim()
}

function luhnCheck(num) {
  let sum = 0
  let alt = false
  for (let i = num.length - 1; i >= 0; i--) {
    let n = parseInt(num[i], 10)
    if (alt) {
      n *= 2
      if (n > 9) n -= 9
    }
    sum += n
    alt = !alt
  }
  return sum % 10 === 0
}

export function validateCardNumber(raw) {
  const digits = stripCardDigits(raw)
  if (!digits) return 'Please enter your card number.'
  if (!/^\d{13,19}$/.test(digits)) return 'Enter a valid 13–19 digit card number.'
  if (!luhnCheck(digits)) return 'Card number looks invalid. Please check and try again.'
  return ''
}

export function validateExpiry(raw) {
  const v = (raw || '').trim()
  if (!v) return 'Please enter the expiry date.'
  const m = v.match(/^(\d{1,2})\/?(\d{2,4})$/)
  if (!m) return 'Use MM / YY format.'
  let month = parseInt(m[1], 10)
  let year = parseInt(m[2], 10)
  if (month < 1 || month > 12) return 'Month must be between 1 and 12.'
  if (year < 100) year += 2000
  const now = new Date()
  const expiry = new Date(year, month, 1)
  if (expiry < new Date(now.getFullYear(), now.getMonth(), 1)) return 'This card has expired.'
  return ''
}

export function formatExpiry(raw) {
  const digits = stripCardDigits(raw).slice(0, 4)
  if (digits.length >= 3) return `${digits.slice(0, 2)} / ${digits.slice(2)}`
  return digits
}

export function validateCvv(raw) {
  const v = stripCardDigits(raw)
  if (!v) return 'Please enter the CVV.'
  if (v.length < 3 || v.length > 4) return 'CVV must be 3 or 4 digits.'
  return ''
}

export function validateCardholderName(name) {
  const n = (name || '').trim()
  if (!n) return 'Please enter the name on the card.'
  if (n.length < 2) return 'Name must be at least 2 characters.'
  if (!/^[a-zA-Z][a-zA-Z .'\-]*$/.test(n)) return 'Enter a valid name.'
  return ''
}

// ─── Net banking ─────────────────────────────────────────────────────────

export function validateBankSelection(bank) {
  if (!bank) return 'Please select a bank.'
  return ''
}

// ─── Pricing ─────────────────────────────────────────────────────────────
// Single source of truth for checkout arithmetic. Every step — Order Summary
// and Payment — must use this so the final payable amount never drifts.

export function computeTotals({ subtotal, coupon, shipping, tax, fee }) {
  const discount = coupon ? Math.round(subtotal * coupon.discount) : 0
  const total = subtotal - discount + (shipping || 0) + (tax || 0) + (fee || 0)
  return { discount, total }
}
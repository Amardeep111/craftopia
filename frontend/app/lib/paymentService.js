/**
 * PaymentService — client-side payment abstraction.
 *
 * The UI talks ONLY to this layer. Provider-specific logic lives here (and in
 * the server routes it calls), never inside React components. This keeps the
 * UI testable and lets a real gateway be wired in later without touching UI.
 *
 * Real provider credentials are read server-side from env vars. The browser
 * never sees secret keys. During development, when no provider is configured,
 * the service uses a clearly-labelled TEST flow that does NOT fabricate a
 * successful transaction — it returns an explicit `testMode` flag so the UI
 * can surface "no real payment was processed".
 */
'use client'

import { COD_FEE, PAYMENT_FEE, PAYMENT_FEE_FOR } from './paymentFees'

// ─── Public API ───────────────────────────────────────────────────────────

/**
 * initializePayment({ method, details, amount, currency })
 * @returns { loading, error, data }
 *   data: { provider, providerReference, testMode }
 */
export async function initializePayment({ method, details, amount, currency = 'INR' }) {
  const res = await fetch('/api/payment/initialize', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ method, details, amount, currency }),
  })
  let payload
  try {
    payload = await res.json()
  } catch {
    payload = { success: false, error: 'No response from payment service.' }
  }
  if (!res.ok || !payload.success) {
    throw new Error(payload.error || 'Failed to initialize payment.')
  }
  return payload.data
}

/**
 * confirmPayment({ method, providerReference, details })
 * @returns { verified, status, order, testMode }
 */
export async function confirmPayment({ method, providerReference, details }) {
  const res = await fetch('/api/payment/confirm', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ method, providerReference, details }),
  })
  let payload
  try {
    payload = await res.json()
  } catch {
    payload = { success: false, error: 'No response from payment service.' }
  }
  if (!res.ok || !payload.success) {
    throw new Error(payload.error || 'Payment confirmation failed.')
  }
  return payload.data
}

/**
 * createOrder({ customer, address, items, totals, payment })
 * @returns { orderId, orderNumber, status }
 */
export async function createOrder(payload) {
  const res = await fetch('/api/orders', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  let body
  try {
    body = await res.json()
  } catch {
    body = { success: false, error: 'No response from server.' }
  }
  if (!res.ok || !body.success) {
    throw new Error(body.error || 'Failed to create order.')
  }
  return body.data
}

/**
 * estimateFee({ method, amount })
 * @returns { fee: number, free: boolean }
 */
export async function estimateFee({ method, amount }) {
  try {
    const res = await fetch('/api/payment/fee', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ method, amount }),
    })
    const body = await res.json().catch(() => ({}))
    if (res.ok && body.success) return body.data
  } catch {
    /* fall back to client-side rule */
  }
  return { fee: PAYMENT_FEE_FOR(method, amount), free: false }
}

// Re-export fee constants for the pricing layer.
export { COD_FEE, PAYMENT_FEE, PAYMENT_FEE_FOR } from './paymentFees'
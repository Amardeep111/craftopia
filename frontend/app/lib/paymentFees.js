/**
 * Payment fee rules.
 *
 * These are simple, transparent rules that the server route can also compute.
 * COD carries a small handling fee; online methods are fee-free unless a future
 * gateway adds one. Fee rules live here (not in the UI) so they can be changed
 * in one place and stay consistent between client and server.
 */

// COD handling fee (₹) — flat, small, clearly disclosed.
// COD fees are set per product in the admin catalog and summed at checkout.
export const COD_FEE = 0

// Online payment handling fee. Currently 0 — no gateway fee is charged.
export const PAYMENT_FEE = 0

export function PAYMENT_FEE_FOR(method, amount) {
  if (method === 'cod') return COD_FEE
  return PAYMENT_FEE
}

export function methodHasFee(method) {
  return PAYMENT_FEE_FOR(method, 0) > 0
}

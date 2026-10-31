/**
 * Payment provider abstraction.
 *
 * Provider-specific business logic lives HERE and in the API routes — never
 * in the UI. When a real gateway is configured (env vars set), the provider
 * adapter is used. When not configured, the service returns an explicit
 * `testMode: true` response. It NEVER fabricates a successful transaction.
 *
 * To connect a real provider later:
 *   1. Add a new adapter under lib/paymentProviders/<name>.js
 *   2. Set the PROVIDER env var
 *   3. Set the provider's secret key(s) in env — never NEXT_PUBLIC_*
 */

// ─── Configuration ────────────────────────────────────────────────────────

// Public env var is safe for the browser; the secret counterpart stays server-only.
const RAZORPAY_PUBLIC_KEY = process.env.RAZORPAY_PUBLIC_KEY || ''
const RAZORPAY_SECRET_KEY = process.env.RAZORPAY_SECRET_KEY || ''
const PROVIDER = (process.env.PAYMENT_PROVIDER || 'test').toLowerCase()

export function isConfigured() {
  return PROVIDER !== 'test' && !!RAZORPAY_SECRET_KEY
}

export function isTestMode() {
  return !isConfigured()
}

// ─── Contract ─────────────────────────────────────────────────────────────
//
// initializePaymentProvider({ method, details, amount, currency })
//   -> { provider, providerReference, amount, currency, testMode }
//
// verifyPaymentProvider({ method, providerReference, details })
//   -> { verified, status, testMode, providerReference }
//
// Both throw on any internal error so the route handler can report it.

// ─── Provider adapters ────────────────────────────────────────────────────

const testAdapter = {
  name: 'test',
  async initialize({ method, details, amount, currency }) {
    return {
      provider: 'test',
      providerReference: `TEST_${method.toUpperCase()}_${Date.now()}`,
      amount,
      currency: currency || 'INR',
      testMode: true,
    }
  },
  async verify({ method, providerReference }) {
    // The test adapter ALWAYS rejects verification — it is not a real provider.
    // A genuine test-mode gateway (e.g. Razorpay test keys) should be wired
    // here; until then we refuse to mark the order paid.
    throw new Error(
      'No real payment provider is configured. This is a test-mode response — no payment was processed.'
    )
  },
}

const razorpayAdapter = {
  name: 'razorpay',
  async initialize({ method, details, amount, currency }) {
    // Real Razorpay order creation happens server-side.
    const order = await createRazorpayOrder({ amount, currency, method, details })
    return {
      provider: 'razorpay',
      providerReference: order.id,
      amount: order.amount,
      currency: order.currency,
      testMode: false,
    }
  },
  async verify({ method, providerReference, details }) {
    // Verify signature with the secret key (server-side only).
    const verified = await verifyRazorpaySignature(providerReference, details)
    if (!verified) {
      throw new Error('Payment signature verification failed.')
    }
    return { verified: true, status: 'success', providerReference, testMode: false }
  },
}

async function createRazorpayOrder({ amount, currency }) {
  // Placeholder: replace with the actual Razorpay API call using RAZORPAY_SECRET_KEY.
  // No secret key is ever exposed to the browser in this module.
  throw new Error('Razorpay adapter is not fully wired. Set PAYMENT_PROVIDER=test for now.')
}

async function verifyRazorpaySignature(reference, details) {
  throw new Error('Razorpay verification is not wired.')
}

function getAdapter() {
  if (PROVIDER === 'razorpay') return razorpayAdapter
  return testAdapter
}

// ─── Public API ───────────────────────────────────────────────────────────

export async function initializePaymentProvider(input) {
  const adapter = getAdapter()
  const result = await adapter.initialize(input)
  // Always surface whether this is a real or test-mode flow.
  result.testMode = result.testMode ?? isTestMode()
  return result
}

export async function verifyPaymentProvider(input) {
  const adapter = getAdapter()
  return adapter.verify(input)
}
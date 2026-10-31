/**
 * Payment provider registry and factory.
 * Supports UPI, Cash on Delivery, and future providers.
 */
import { upiProvider } from './providers/upi'
import { razorpayProvider } from './providers/razorpay'

const PROVIDERS = {
  upi: upiProvider,
  razorpay: razorpayProvider,
  test: {
    name: 'test',
    async initialize({ amount, currency }) {
      return {
        provider: 'test',
        providerReference: `TEST_${Date.now()}`,
        amount,
        currency: currency || 'INR',
        testMode: true,
      }
    },
    async verify() {
      throw new Error('Test provider cannot verify payments.')
    },
  },
}

const COD_PROVIDER = {
  name: 'cod',
  async initialize({ amount, currency, orderNumber }) {
    return {
      provider: 'cod',
      providerReference: orderNumber,
      amount,
      currency: currency || 'INR',
      testMode: false,
    }
  },
  async verify() {
    return {
      verified: true,
      status: 'COD_PENDING_COLLECTION',
      testMode: false,
    }
  },
}

export function getPaymentProvider(name) {
  const provider = PROVIDERS[name] || PROVIDERS.test
  if (!provider) {
    throw new Error(`Payment provider "${name}" not found.`)
  }
  return provider
}

export function getCODProvider() {
  return COD_PROVIDER
}

export const availableProviders = Object.keys(PROVIDERS).concat(['cod'])

export const PAYMENT_METHODS = [
  { id: 'upi', label: 'UPI / Pay with QR', provider: 'upi', available: true },
  { id: 'cod', label: 'Cash on Delivery', provider: 'cod', available: true },
]

export const PAYMENT_METHOD_ORDER = ['upi', 'razorpay', 'cod']

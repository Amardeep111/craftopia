/**
 * Production-ready REST API Client for Jamae's Craftopia Frontend.
 * Communicates with the standalone Go backend service.
 */

const getBaseUrl = () => {
  if (typeof window !== 'undefined') {
    return (process.env.NEXT_PUBLIC_API_URL || '').replace(/\/$/, '')
  }
  return (process.env.GO_BACKEND_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080').replace(/\/$/, '')
}

class APIError extends Error {
  constructor(message, status = 500, data = null) {
    super(message)
    this.name = 'APIError'
    this.status = status
    this.data = data
  }
}

async function request(endpoint, options = {}) {
  const baseUrl = getBaseUrl()
  const path = endpoint.startsWith('/') ? endpoint : `/${endpoint}`
  const url = `${baseUrl}${path}`

  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  }

  // Handle FormData
  if (options.body instanceof FormData) {
    delete headers['Content-Type']
  }

  const config = {
    ...options,
    headers,
    credentials: options.credentials || 'include',
  }

  try {
    const response = await fetch(url, config)
    const text = await response.text()
    let data
    try {
      data = JSON.parse(text)
    } catch {
      data = { message: text }
    }

    if (!response.ok || (data && data.success === false)) {
      const errMsg = data?.error || data?.message || `Request failed with status ${response.status}`
      throw new APIError(errMsg, response.status, data)
    }

    return data?.data !== undefined ? data.data : data
  } catch (err) {
    if (err instanceof APIError) throw err
    throw new APIError(err.message || 'Network connection failed. Please check your internet.', 0)
  }
}

export const api = {
  // Health & Service Probes
  health: {
    live: () => request('/health/live'),
    ready: () => request('/health/ready'),
    status: () => request('/api/health'),
  },

  // Catalog & Products
  products: {
    list: (params = {}) => {
      const qs = new URLSearchParams()
      if (params.category && params.category !== 'all') qs.set('category', params.category)
      if (params.featured) qs.set('featured', 'true')
      if (params.limit) qs.set('limit', String(params.limit))
      if (params.skip) qs.set('skip', String(params.skip))
      const query = qs.toString()
      return request(`/api/products${query ? `?${query}` : ''}`, { cache: 'no-store' })
    },
    get: (idOrSlug) => request(`/api/products/${encodeURIComponent(idOrSlug)}`, { cache: 'no-store' }),
  },

  // Categories
  categories: {
    list: () => request('/api/categories', { cache: 'no-store' }),
  },

  // Cart
  cart: {
    get: () => request('/api/cart', { cache: 'no-store' }),
    save: (items) => request('/api/cart', { method: 'PUT', body: JSON.stringify({ items }) }),
    validate: (items) => request('/api/cart/validate', { method: 'POST', body: JSON.stringify({ items }) }),
  },

  // Coupons
  coupons: {
    validate: (code, subtotal) => request('/api/coupons/validate', { method: 'POST', body: JSON.stringify({ code, subtotal }) }),
  },

  // Orders & Payment
  orders: {
    create: (orderPayload) => request('/api/orders', { method: 'POST', body: JSON.stringify(orderPayload) }),
    get: (orderId) => request(`/api/orders/${encodeURIComponent(orderId)}`, { cache: 'no-store' }),
    myOrders: () => request('/api/orders', { cache: 'no-store' }),
    verifyPayment: (orderId, utr) => request(`/api/orders/${encodeURIComponent(orderId)}/verify-payment`, { method: 'PATCH', body: JSON.stringify({ utr }) }),
  },

  // UPI Payments
  payment: {
    getUPIDetails: (amount, orderId) => {
      const qs = new URLSearchParams()
      if (amount) qs.set('amount', String(amount))
      if (orderId) qs.set('orderId', String(orderId))
      const query = qs.toString()
      return request(`/api/payment/upi-details${query ? `?${query}` : ''}`, { cache: 'no-store' })
    },
  },

  // Custom Requests
  customRequests: {
    create: (data) => request('/api/custom-requests', { method: 'POST', body: JSON.stringify(data) }),
    list: () => request('/api/custom-requests', { cache: 'no-store' }),
    accept: (id, payload) => request(`/api/custom-requests/${encodeURIComponent(id)}/accept`, { method: 'POST', body: JSON.stringify(payload) }),
  },

  // Addresses
  addresses: {
    list: () => request('/api/addresses', { cache: 'no-store' }),
    create: (data) => request('/api/addresses', { method: 'POST', body: JSON.stringify(data) }),
    delete: (id) => request(`/api/addresses/${encodeURIComponent(id)}`, { method: 'DELETE' }),
  },

  // Reviews
  reviews: {
    list: (productId) => request(`/api/reviews/${encodeURIComponent(productId)}`, { cache: 'no-store' }),
  },

  // Contact Messages
  contact: {
    submit: (data) => request('/api/contact', { method: 'POST', body: JSON.stringify(data) }),
  },

  // Authentication & Sessions
  auth: {
    me: () => request('/api/auth/me', { cache: 'no-store' }),
    login: (credentials) => request('/api/auth/login', { method: 'POST', body: JSON.stringify(credentials) }),
    signup: (data) => request('/api/auth/signup', { method: 'POST', body: JSON.stringify(data) }),
  },
}

export { APIError }
export default api

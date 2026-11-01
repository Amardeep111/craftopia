import 'server-only'
import { cache } from 'react'
import { headers } from 'next/headers'

const backendURL = (process.env.GO_BACKEND_URL || process.env.NEXT_PUBLIC_API_URL || (process.env.NODE_ENV === 'production' ? 'https://craftopia-backend.vercel.app' : 'http://localhost:8080')).replace(/\/$/, '')

function getSessionCookie(cookieHeader) {
  return cookieHeader
    ?.split(';')
    .map((part) => part.trim())
    .find((part) => part.startsWith('jamaes_session=')) || ''
}

const fetchUserForCookie = cache(async (sessionCookie) => {
  try {
    const response = await fetch(`${backendURL}/api/auth/me`, {
      headers: { cookie: sessionCookie },
      cache: 'no-store',
    })
    if (!response.ok) return null
    const result = await response.json()
    const user = result?.success ? result.data?.user : null
    return user ? { ...user, userId: user.userId || user.id } : null
  } catch {
    return null
  }
})

const fetchAddressesForCookie = cache(async (sessionCookie) => {
  try {
    const response = await fetch(`${backendURL}/api/addresses`, {
      headers: { cookie: sessionCookie },
      cache: 'no-store',
    })
    const result = await response.json().catch(() => ({}))
    if (!response.ok || !result.success || !Array.isArray(result.data)) {
      return { addresses: [], error: result.error || 'Could not load saved addresses.' }
    }
    return { addresses: result.data, error: '' }
  } catch {
    return { addresses: [], error: 'Could not load saved addresses.' }
  }
})

const fetchCartForCookie = cache(async (sessionCookie) => {
  try {
    const response = await fetch(`${backendURL}/api/cart`, {
      headers: { cookie: sessionCookie },
      cache: 'no-store',
    })
    const result = await response.json().catch(() => ({}))
    return response.ok && result.success && Array.isArray(result.data) ? result.data : null
  } catch {
    return null
  }
})

async function getSessionCookieForRequest() {
  const requestHeaders = await headers()
  return getSessionCookie(requestHeaders.get('cookie'))
}

export async function getServerUser() {
  const sessionCookie = await getSessionCookieForRequest()
  return sessionCookie ? fetchUserForCookie(sessionCookie) : null
}

export async function getServerAddresses() {
  const sessionCookie = await getSessionCookieForRequest()
  return sessionCookie
    ? fetchAddressesForCookie(sessionCookie)
    : { addresses: [], error: 'Please sign in to view saved addresses.' }
}

export async function getServerCart() {
  const sessionCookie = await getSessionCookieForRequest()
  return sessionCookie ? fetchCartForCookie(sessionCookie) : null
}

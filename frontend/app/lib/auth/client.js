'use client'

let authPromise = null
let authCache = null
let authCacheTime = 0
const AUTH_CACHE_TTL_MS = 25_000 // 25s memory cache

/**
 * Deduplicated, cached caller for /api/auth/me.
 * Prevents multiple components (Navbar, CartSync, etc.) from firing redundant
 * blocking network calls simultaneously during page load or route transitions.
 */
export function fetchCurrentUser(force = false) {
  const now = Date.now()
  if (!force && authCache && (now - authCacheTime < AUTH_CACHE_TTL_MS)) {
    return Promise.resolve(authCache)
  }

  if (!authPromise) {
    authPromise = fetch('/api/auth/me', { cache: 'no-store' })
      .then(async (response) => {
        const result = await response.json().catch(() => ({}))
        if (response.ok && result.success && result.data) {
          authCache = { authenticated: true, user: result.data }
        } else {
          authCache = { authenticated: false, user: null }
        }
        authCacheTime = Date.now()
        return authCache
      })
      .catch(() => {
        authCache = { authenticated: false, user: null }
        authCacheTime = Date.now()
        return authCache
      })
      .finally(() => {
        authPromise = null
      })
  }

  return authPromise
}

export function invalidateAuthCache() {
  authCache = null
  authCacheTime = 0
  authPromise = null
}


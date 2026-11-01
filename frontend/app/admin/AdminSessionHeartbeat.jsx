'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

const HEARTBEAT_INTERVAL = 5 * 60 * 1000
const ACTIVITY_WINDOW = 5 * 60 * 1000

export default function AdminSessionHeartbeat() {
  const router = useRouter()

  useEffect(() => {
    let lastActivity = Date.now()
    let lastHeartbeat = lastActivity
    let lastPointerActivity = 0
    let inFlight = false

    const recordActivity = () => {
      lastActivity = Date.now()
    }
    const recordPointerActivity = () => {
      const now = Date.now()
      if (now - lastPointerActivity < 10_000) return
      lastPointerActivity = now
      lastActivity = now
    }

    const timer = window.setInterval(async () => {
      const now = Date.now()
      if (
        document.visibilityState !== 'visible' ||
        now - lastActivity > ACTIVITY_WINDOW ||
        now - lastHeartbeat < HEARTBEAT_INTERVAL ||
        inFlight
      ) return

      inFlight = true
      try {
        const response = await fetch('/api/auth/heartbeat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: '{}',
          cache: 'no-store',
        })
        if (response.status === 401 || response.status === 403) {
          router.replace('/account/admin-login?redirect=/admin')
          return
        }
        if (response.ok) lastHeartbeat = Date.now()
        else lastHeartbeat = Date.now() - HEARTBEAT_INTERVAL + 60_000
      } catch {
        lastHeartbeat = Date.now() - HEARTBEAT_INTERVAL + 60_000
      } finally {
        inFlight = false
      }
    }, 60_000)

    window.addEventListener('pointerdown', recordActivity, { passive: true })
    window.addEventListener('keydown', recordActivity)
    window.addEventListener('scroll', recordActivity, { passive: true })
    window.addEventListener('touchstart', recordActivity, { passive: true })
    window.addEventListener('pointermove', recordPointerActivity, { passive: true })

    return () => {
      window.clearInterval(timer)
      window.removeEventListener('pointerdown', recordActivity)
      window.removeEventListener('keydown', recordActivity)
      window.removeEventListener('scroll', recordActivity)
      window.removeEventListener('touchstart', recordActivity)
      window.removeEventListener('pointermove', recordPointerActivity)
    }
  }, [router])

  return null
}

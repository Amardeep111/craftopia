'use client'

import { useLinkStatus } from 'next/link'
import { useEffect, useRef, useState } from 'react'
import { usePathname, useSearchParams } from 'next/navigation'

export default function PendingLinkIndicator() {
  const { pending } = useLinkStatus()
  if (!pending) return null
  return <>
    <span className="studio-navigation-progress" aria-hidden="true"><span /></span>
    <span className="sr-only" role="status">Opening page…</span>
  </>
}

const eventName = 'craftopia:navigation-start'
export function notifyNavigation(href) {
  const next = new URL(href, window.location.href)
  if (next.origin !== window.location.origin || `${next.pathname}${next.search}` === `${window.location.pathname}${window.location.search}`) return
  window.dispatchEvent(new Event(eventName))
}

// Lives outside the mobile menu, which closes as soon as a link is tapped.
export function NavigationProgress() {
  const [pending, setPending] = useState(false)
  const timer = useRef(null)
  const pathname = usePathname()
  const searchParams = useSearchParams()
  useEffect(() => {
    const finish = () => { clearTimeout(timer.current); setPending(false) }
    const start = () => {
      clearTimeout(timer.current)
      setPending(true)
      timer.current = setTimeout(finish, 20000)
    }
    window.addEventListener(eventName, start)
    window.addEventListener('popstate', finish)
    return () => { clearTimeout(timer.current); window.removeEventListener(eventName, start); window.removeEventListener('popstate', finish) }
  }, [])
  useEffect(() => { clearTimeout(timer.current); setPending(false) }, [pathname, searchParams])
  return pending ? <>
    <span className="studio-navigation-progress" aria-hidden="true"><span /></span>
    <span className="sr-only" role="status">Opening page…</span>
  </> : null
}

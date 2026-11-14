'use client'

import Link from 'next/link'
import { notifyNavigation } from './PendingLinkIndicator'

export function navigateHome(event) {
  if (window.location.pathname === '/' && !window.location.search) {
    event.preventDefault()
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' })
    return
  }
  notifyNavigation('/')
}
export default function HomeLink({ children, ...props }) {
  return <Link {...props} href="/" prefetch="auto" onNavigate={navigateHome}>{children}</Link>
}

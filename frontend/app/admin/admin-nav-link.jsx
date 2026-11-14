'use client'

import PendingLinkIndicator from '../components/layout/PendingLinkIndicator'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

export default function AdminNavLink({ href, icon, label }) {
  const pathname = usePathname()
  const active = href === '/admin'
    ? pathname === href
    : pathname === href || pathname?.startsWith(`${href}/`)

  return (
    <Link
      href={href}
      scroll={false}
      aria-current={active ? 'page' : undefined}
      className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition ${active
        ? 'bg-blush/60 text-brand'
        : 'text-muted hover:bg-ivory hover:text-ink'
      }`}
    >
      {icon}
      <span>{label}</span>
      <PendingLinkIndicator />
    </Link>
  )
}

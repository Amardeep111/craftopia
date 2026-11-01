'use client'

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
      className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition ${active
        ? 'bg-plum text-cream shadow-soft'
        : 'text-cream/80 hover:bg-plum/50 hover:text-cream'
      }`}
    >
      {icon}
      <span>{label}</span>
    </Link>
  )
}

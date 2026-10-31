'use client'

import { usePathname } from 'next/navigation'

export default function ConditionalStorefrontChrome({ children }) {
  const pathname = usePathname()
  if (pathname === '/admin' || pathname?.startsWith('/admin/') || pathname === '/account/admin-login') return null
  return <>{children}</>
}

'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { LogOut } from 'lucide-react'

export default function AdminLogoutButton() {
  const router = useRouter()
  const [busy, setBusy] = useState(false)

  async function logout() {
    if (busy) return
    setBusy(true)
    try {
      await fetch('/api/auth/logout', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' })
    } finally {
      router.replace('/account/admin-login')
      router.refresh()
    }
  }

  return <button type="button" onClick={logout} disabled={busy} className="inline-flex items-center gap-2 rounded-xl border border-cream/30 px-3 py-2 text-sm text-cream hover:bg-cream/10 disabled:opacity-60" aria-label="Log out of admin account">
    <LogOut className="h-4 w-4" aria-hidden="true" />
    <span>{busy ? 'Signing out…' : 'Log out'}</span>
  </button>
}

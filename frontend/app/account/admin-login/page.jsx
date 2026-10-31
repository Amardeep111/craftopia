'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { AlertCircle, ArrowLeft, LockKeyhole, Shield } from 'lucide-react'
import { useUserStore } from '@/lib/user'
import { encryptPassword } from '@/lib/auth/password-encryption-client'

export default function AdminLoginPage() {
  const router = useRouter()
  const userLogin = useUserStore((state) => state.login)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function submit(event) {
    event.preventDefault()
    setError('')
    setLoading(true)
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, encryptedPassword: await encryptPassword(password), adminOnly: true }),
      })
      const result = await response.json()
      if (!response.ok || !result.success) throw new Error(result.error || 'Could not sign in.')
      const user = result.data.user
      userLogin({ email: user.email, name: user.name, userId: user.id })
      const destination = new URLSearchParams(window.location.search).get('redirect')
      router.replace(destination?.startsWith('/admin') ? destination : '/admin')
    } catch (cause) {
      setError(cause.message || 'Could not sign in. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-blush/60 via-ivory to-ink/10 px-4 py-12">
      <section className="w-full max-w-md rounded-3xl border border-sand bg-cream/95 p-7 shadow-soft sm:p-9">
        <div className="mb-8 flex items-center gap-3">
          <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-plum text-cream"><Shield className="h-6 w-6" aria-hidden="true" /></span>
          <div><p className="text-xs font-bold uppercase tracking-[0.2em] text-bloom">Jamae&apos;s Craftopia</p><h1 className="font-display text-2xl font-semibold text-plum">Admin sign in</h1></div>
        </div>
        <p className="mb-6 text-sm leading-6 text-muted">Sign in with an administrator account to manage the shop.</p>
        {error && <p role="alert" className="mb-5 flex items-start gap-2 rounded-xl bg-bloom/10 p-3 text-sm text-bloom"><AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />{error}</p>}
        <form onSubmit={submit} className="space-y-5">
          <label className="block text-sm font-medium text-plum">Email address<input autoComplete="username" type="email" required value={email} onChange={(event) => setEmail(event.target.value)} className="mt-2 w-full rounded-full border border-sand bg-white px-4 py-3 text-ink outline-none transition focus:border-bloom focus:ring-2 focus:ring-bloom/20" /></label>
          <label className="block text-sm font-medium text-plum">Password<input autoComplete="current-password" type="password" required value={password} onChange={(event) => setPassword(event.target.value)} className="mt-2 w-full rounded-full border border-sand bg-white px-4 py-3 text-ink outline-none transition focus:border-bloom focus:ring-2 focus:ring-bloom/20" /></label>
          <button type="submit" disabled={loading} className="flex w-full items-center justify-center gap-2 rounded-full bg-plum px-5 py-3 font-semibold text-cream shadow-soft transition hover:bg-ink disabled:cursor-wait disabled:opacity-60"><LockKeyhole className="h-4 w-4" aria-hidden="true" />{loading ? 'Signing in…' : 'Sign in to admin'}</button>
        </form>
        <Link href="/account/login" className="mt-6 inline-flex items-center gap-2 text-sm text-muted underline-offset-4 hover:text-plum hover:underline"><ArrowLeft className="h-4 w-4" aria-hidden="true" />Back to customer sign in</Link>
      </section>
    </main>
  )
}

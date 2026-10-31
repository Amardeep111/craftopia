'use client'

import { useEffect, useRef, useState } from 'react'
import { encryptPassword } from '@/lib/auth/password-encryption-client'

export default function ChangePasswordForm({ title = 'Change password' }) {
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [saving, setSaving] = useState(false)
  const [challengeId, setChallengeId] = useState('')
  const [step, setStep] = useState(1)
  const [ready, setReady] = useState(false)
  const passwordValues = useRef({ current: '', next: '', confirm: '' })
  useEffect(() => { setReady(true) }, [])

  async function submit(event) {
    event.preventDefault(); setError(''); setNotice('')
    const form = event.currentTarget
    const fields = new FormData(form)
    if (challengeId) {
      const otp = String(fields.get('password_change_otp') || '')
      if (!/^\d{6}$/.test(otp)) { setError('Enter the six-digit code sent to your email.'); return }
      setSaving(true)
      try {
        const response = await fetch('/api/account/password/verify', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ challengeId, otp }) })
        const result = await response.json()
        if (!response.ok || !result.success) throw new Error(result.error || 'Could not verify the code.')
        form.reset(); setChallengeId(''); setStep(1); passwordValues.current = { current: '', next: '', confirm: '' }; setNotice(result.message || 'Your password was updated.')
      } catch (cause) { setError(cause.message || 'Could not verify the code.') } finally { setSaving(false) }
      return
    }
    if (step === 1) {
      const current = String(fields.get('currentPassword') || passwordValues.current.current)
      if (!current) { setError('Enter your current password.'); return }
      passwordValues.current.current = current
      setStep(2)
      return
    }
    const next = String(fields.get('newPassword') || passwordValues.current.next)
    const confirm = String(fields.get('confirmPassword') || passwordValues.current.confirm)
    const current = passwordValues.current.current
    if (!next) { setError('Enter a new password.'); return }
    if (next !== confirm) { setError('The new passwords do not match.'); return }
    if (next.length < 8 || !/[A-Z]/.test(next) || !/[a-z]/.test(next) || !/[0-9]/.test(next)) { setError('Use at least 8 characters with uppercase, lowercase, and a number.'); return }
    setSaving(true)
    try {
      const [currentPassword, newPassword] = await Promise.all([encryptPassword(current), encryptPassword(next)])
      const response = await fetch('/api/account/password', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ currentPassword, newPassword }) })
      const result = await response.json()
      if (!response.ok || !result.success) throw new Error(result.error || 'Could not change password.')
      form.reset(); setChallengeId(result.challengeId); setNotice(result.message || 'Check your email for a verification code.')
    } catch (cause) { setError(cause.message || 'Could not change password.') } finally { setSaving(false) }
  }

  return <section className="rounded-3xl border border-sand bg-cream p-5 shadow-soft sm:p-7"><div className="mb-5"><h2 className="font-display text-xl text-plum">{title}</h2><p className="mt-1 text-sm text-muted">Use at least 8 characters with uppercase, lowercase, and a number.</p></div>
    {error && <p role="alert" className="mb-4 rounded-xl bg-bloom/10 p-3 text-sm text-bloom">{error}</p>}{notice && <p role="status" className="mb-4 rounded-xl bg-sage/20 p-3 text-sm">{notice}</p>}
    <form noValidate data-hydrated={ready ? 'true' : 'false'} autoComplete="on" onSubmit={submit} className="grid gap-4 sm:grid-cols-2">{challengeId ? <label className="text-sm font-medium text-plum sm:col-span-2">Email verification code<input name="password_change_otp" type="text" inputMode="numeric" autoComplete="one-time-code" maxLength={6} onInput={(event) => { event.currentTarget.value = event.currentTarget.value.replace(/\D/g, '').slice(0, 6) }} className="mt-1.5 min-h-11 w-full rounded-xl border border-sand bg-white px-3" /></label> : step === 1 ? <label className="text-sm font-medium text-plum sm:col-span-2">Current password<input name="currentPassword" type="password" autoComplete="current-password" onInput={(event) => { passwordValues.current.current = event.currentTarget.value }} className="mt-1.5 min-h-11 w-full rounded-xl border border-sand bg-white px-3" /></label> : <><label className="text-sm font-medium text-plum">New password<input name="newPassword" type="password" autoComplete="new-password" onInput={(event) => { passwordValues.current.next = event.currentTarget.value }} className="mt-1.5 min-h-11 w-full rounded-xl border border-sand bg-white px-3" /></label><label className="text-sm font-medium text-plum">Confirm new password<input name="confirmPassword" type="password" autoComplete="new-password" onInput={(event) => { passwordValues.current.confirm = event.currentTarget.value }} className="mt-1.5 min-h-11 w-full rounded-xl border border-sand bg-white px-3" /></label></>}<div className="sm:col-span-2"><button disabled={saving || !ready} className="min-h-11 rounded-full bg-plum px-5 py-2.5 font-semibold text-cream disabled:opacity-60">{saving ? (challengeId ? 'Verifying…' : 'Sending code…') : (challengeId ? 'Verify and update password' : step === 1 ? 'Continue' : 'Send verification code')}</button>{(challengeId || step === 2) && <button type="button" onClick={() => { if (challengeId) { setChallengeId(''); passwordValues.current = { current: '', next: '', confirm: '' } } else setStep(1); setNotice(''); setError('') }} className="ml-3 min-h-11 rounded-full border border-sand px-5 py-2.5">Cancel</button>}</div></form>
  </section>
}

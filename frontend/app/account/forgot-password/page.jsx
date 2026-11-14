'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ArrowLeft, CheckCircle2, KeyRound } from 'lucide-react'
import { FlowerBurst } from '@/components/ui/Decor'
import Input from '@/components/ui/Input'
import Button from '@/components/ui/Button'
import { cn } from '@/lib/cn'
import { encryptPassword } from '@/lib/auth/password-encryption-client'
import { isDisposableEmail } from '@/lib/auth/disposable-email'

const OTP_LENGTH = 6
const emailRe = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/

function isValidEmail(v) {
  return emailRe.test(String(v).trim())
}

function formatMasked(v) {
  const t = String(v).trim()
  if (t.includes('@')) {
    const [local, domain] = t.split('@')
    return `${local.slice(0, 2)}***@${domain}`
  }
  return t
}

function OtpInput({ value, onChange, error }) {
  const ref = useRef(null)
  const digits = value.replace(/\D/g, '').slice(0, OTP_LENGTH)

  function setAt(index, raw) {
    const arr = digits.split('')
    while (arr.length < OTP_LENGTH) arr.push('')
    const digit = raw.slice(-1)
    if (raw === '') {
      arr.splice(index, 1)
    } else if (/^\d$/.test(digit)) {
      arr[index] = digit
    } else {
      return
    }
    onChange(arr.join('').replace(/\s/g, ''))
    if (digit && index < OTP_LENGTH - 1) {
      const n = ref.current?.children[index + 1]
      n?.focus()
    }
  }

  return (
    <div
      ref={ref}
      className="flex justify-center gap-2"
      onPaste={(e) => {
        e.preventDefault()
        const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, OTP_LENGTH)
        if (pasted) {
          onChange(pasted)
          ref.current?.children[Math.min(pasted.length, OTP_LENGTH - 1)]?.focus()
        }
      }}
    >
      {Array.from({ length: OTP_LENGTH }).map((_, i) => (
        <input
          key={i}
          type="text"
          inputMode="numeric"
          autoComplete="one-time-code"
          maxLength={1}
          aria-label={`Digit ${i + 1} of ${OTP_LENGTH}`}
          value={digits[i] || ''}
          onChange={(e) => setAt(i, e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Backspace' && !digits[i] && i > 0) {
              ref.current?.children[i - 1]?.focus()
            } else if (e.key === 'ArrowLeft' && i > 0) {
              ref.current?.children[i - 1]?.focus()
            } else if (e.key === 'ArrowRight' && i < OTP_LENGTH - 1) {
              ref.current?.children[i + 1]?.focus()
            }
          }}
          className={cn(
            'h-14 w-11 rounded-2xl border-2 bg-cream text-center text-xl font-bold tracking-widest text-brand',
            'outline-none transition focus:ring-2 focus:ring-bloom/30',
            error ? 'border-bloom' : 'border-sand',
          )}
        />
      ))}
    </div>
  )
}

export default function ForgotPasswordPage() {
  // step: 'request' | 'reset' | 'success'
  const [step, setStep] = useState('request')
  const [email, setEmail] = useState('')
  const [challengeId, setChallengeId] = useState('')
  const [otp, setOtp] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [errors, setErrors] = useState({})
  const [loading, setLoading] = useState(false)
  const [resendCooldown, setResendCooldown] = useState(30)
  const [resendLoading, setResendLoading] = useState(false)
  const router = useRouter()

  useEffect(() => {
    if (step !== 'reset' || !resendCooldown) return undefined
    const timer = setTimeout(() => setResendCooldown((current) => Math.max(0, current - 1)), 1000)
    return () => clearTimeout(timer)
  }, [step, resendCooldown])

  async function handleRequestCode(e) {
    e.preventDefault()
    setErrors({})
    const trimmed = email.trim()
    if (!trimmed) {
      setErrors({ email: 'Please enter your email address.' })
      return
    }
    if (!isValidEmail(trimmed)) {
      setErrors({ email: 'Please enter a valid email address.' })
      return
    }
    if (isDisposableEmail(trimmed)) {
      setErrors({ email: 'Temporary or disposable email addresses are not permitted. Please use a valid personal or work email.' })
      return
    }

    setLoading(true)
    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: trimmed }),
      })
      const data = await res.json()
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to send reset code. Please try again.')
      }

      setChallengeId(data.data?.challengeId || '')
      setResendCooldown(30)
      setStep('reset')
    } catch (err) {
      setErrors({ form: err.message || 'Something went wrong. Please try again.' })
    } finally {
      setLoading(false)
    }
  }

  async function handleResendCode() {
    if (resendCooldown || resendLoading || !challengeId) return
    setErrors({})
    setResendLoading(true)
    try {
      const res = await fetch('/api/auth/otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ challengeId }),
      })
      const data = await res.json()
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Could not resend the code.')
      }
      setOtp('')
      setResendCooldown(30)
    } catch (err) {
      setErrors({ form: err.message || 'Could not resend the code.' })
    } finally {
      setResendLoading(false)
    }
  }

  async function handleResetPassword(e) {
    e.preventDefault()
    setErrors({})

    const cleanOtp = otp.replace(/\D/g, '')
    if (cleanOtp.length < OTP_LENGTH) {
      setErrors({ otp: 'Please enter the complete 6-digit verification code.' })
      return
    }

    if (password.length < 8 || !/[A-Z]/.test(password) || !/[a-z]/.test(password) || !/[0-9]/.test(password)) {
      setErrors({ password: 'Use at least 8 characters with uppercase, lowercase, and a number.' })
      return
    }

    if (password !== confirmPassword) {
      setErrors({ confirmPassword: 'Passwords do not match.' })
      return
    }

    setLoading(true)
    try {
      const encryptedPassword = await encryptPassword(password)
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          challengeId,
          otp: cleanOtp,
          encryptedPassword,
        }),
      })
      const data = await res.json()
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to reset password. Please try again.')
      }

      setStep('success')
    } catch (err) {
      setErrors({ form: err.message || 'Failed to reset password. Please try again.' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="container-page flex min-h-[calc(100vh-4.5rem)] items-center justify-center px-4 py-16">
      <section className="paper-card w-full max-w-md p-8 sm:p-10">
        <Link
          href="/account/login"
          className="mb-8 inline-flex items-center gap-2 text-sm font-semibold text-muted transition hover:text-brand"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Back to sign in
        </Link>

        {step === 'request' && (
          <>
            <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-blush/80">
              <KeyRound className="h-6 w-6 text-accent" />
            </div>
            <h1 className="heading-display text-3xl">Forgot your password?</h1>
            <p className="mt-2 text-muted">
              Enter the email address registered with your account, and we’ll send you a 6-digit verification code to reset your password.
            </p>

            <form onSubmit={handleRequestCode} className="mt-8 space-y-5" noValidate>
              <Input
                label="Email address"
                type="email"
                inputMode="email"
                autoComplete="email"
                placeholder="Enter your email address"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value)
                  setErrors((prev) => ({ ...prev, email: '', form: '' }))
                }}
                error={errors.email}
                className="text-base"
              />

              {errors.form && (
                <p role="alert" className="text-sm font-medium text-accent">
                  {errors.form}
                </p>
              )}

              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? 'Sending code…' : 'Send verification code'}
              </Button>
            </form>
          </>
        )}

        {step === 'reset' && (
          <>
            <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-blush/80">
              <FlowerBurst className="h-7 w-7 text-accent" />
            </div>
            <h1 className="heading-display text-3xl">Reset your password</h1>
            <p className="mt-2 text-muted">
              Enter the 6-digit code sent to{' '}
              <span className="font-medium text-brand">{formatMasked(email)}</span> and choose a new password.
            </p>

            <form onSubmit={handleResetPassword} className="mt-8 space-y-5" noValidate>
              <div>
                <label className="block text-sm font-medium text-brand mb-2 text-center">
                  Verification code
                </label>
                <OtpInput
                  value={otp}
                  onChange={(v) => {
                    setOtp(v)
                    setErrors((prev) => ({ ...prev, otp: '', form: '' }))
                  }}
                  error={!!errors.otp}
                />
                {errors.otp && (
                  <p role="alert" className="mt-2 text-center text-sm font-medium text-accent">
                    {errors.otp}
                  </p>
                )}
              </div>

              <Input
                label="New password"
                type="password"
                autoComplete="new-password"
                placeholder="At least 8 characters"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value)
                  setErrors((prev) => ({ ...prev, password: '', form: '' }))
                }}
                error={errors.password}
                className="text-base"
              />

              <Input
                label="Confirm new password"
                type="password"
                autoComplete="new-password"
                placeholder="Confirm your new password"
                value={confirmPassword}
                onChange={(e) => {
                  setConfirmPassword(e.target.value)
                  setErrors((prev) => ({ ...prev, confirmPassword: '', form: '' }))
                }}
                error={errors.confirmPassword}
                className="text-base"
              />

              {errors.form && (
                <p role="alert" className="text-sm font-medium text-accent">
                  {errors.form}
                </p>
              )}

              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? 'Updating password…' : 'Update password'}
              </Button>

              <div className="flex flex-col items-center gap-2 text-center pt-2">
                {resendCooldown > 0 ? (
                  <p className="text-sm text-muted">Resend code in {resendCooldown}s</p>
                ) : (
                  <button
                    type="button"
                    onClick={handleResendCode}
                    disabled={resendLoading}
                    className="text-sm font-semibold text-accent underline underline-offset-4 disabled:opacity-50"
                  >
                    {resendLoading ? 'Sending…' : 'Resend code'}
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => {
                    setStep('request')
                    setOtp('')
                    setErrors({})
                  }}
                  className="text-sm text-muted hover:text-brand transition"
                >
                  Change email address
                </button>
              </div>
            </form>
          </>
        )}

        {step === 'success' && (
          <div className="text-center py-4">
            <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-sage/20 text-sage">
              <CheckCircle2 className="h-9 w-9 text-sage" />
            </div>
            <h1 className="heading-display text-3xl">Password updated!</h1>
            <p className="mt-3 text-muted">
              Your password has been reset successfully. For your security, any other active sessions have been signed out.
            </p>
            <Button
              type="button"
              onClick={() => router.push('/account/login')}
              className="mt-8 w-full"
            >
              Sign in with new password
            </Button>
          </div>
        )}
      </section>
    </main>
  )
}

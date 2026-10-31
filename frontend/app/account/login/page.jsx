'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { FlowerBurst } from '@/components/ui/Decor'
import Input from '@/components/ui/Input'
import Button from '@/components/ui/Button'
import { cn } from '@/lib/cn'
import { useUserStore } from '@/lib/user'
import { encryptPassword } from '@/lib/auth/password-encryption-client'

// ─── Constants ────────────────────────────────────────────────────────────────
const OTP_LENGTH = 6

const emailRe = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/
const mobileRe = /^\+?\d{10,15}$/

function isValidEmail(v) {
  return emailRe.test(String(v).trim())
}
function isValidMobile(v) {
  const digits = String(v).replace(/[\s\-().]/g, '')
  return mobileRe.test(digits) && digits.replace(/\D/g, '').length >= 10
}
function isValidEmailOrMobile(v) {
  const t = String(v).trim()
  return isValidEmail(t) || isValidMobile(t)
}
function formatMasked(v) {
  const t = String(v).trim()
  if (isValidEmail(t)) {
    const [local, domain] = t.split('@')
    return `${local.slice(0, 2)}***@${domain}`
  }
  const digits = String(v).replace(/\D/g, '')
  return `***${digits.slice(-4)}`
}

// ─── OTP Input ────────────────────────────────────────────────────────────────
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
    <div ref={ref} className="flex justify-center gap-2" onPaste={(e) => {
      e.preventDefault()
      const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, OTP_LENGTH)
      if (pasted) {
        onChange(pasted)
        ref.current?.children[Math.min(pasted.length, OTP_LENGTH - 1)]?.focus()
      }
    }}>
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
            'h-14 w-11 rounded-2xl border-2 bg-cream text-center text-xl font-bold tracking-widest text-plum',
            'outline-none transition focus:ring-2 focus:ring-bloom/30',
            error ? 'border-bloom' : 'border-sand',
          )}
        />
      ))}
    </div>
  )
}

// ─── AuthCard (shared shell) ─────────────────────────────────────────────────
function AuthCard({ children }) {
  return (
    <div className="paper-card p-8 sm:p-10">
      {children}
    </div>
  )
}

// ─── Login step ───────────────────────────────────────────────────────────────
function LoginStep({ onSwitchToSignup, onVerified }) {
  const [value, setValue] = useState('')
  const [password, setPassword] = useState('')
  const [errors, setErrors] = useState({})
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setErrors({})
    const t = value.trim()
    if (!t) { setErrors({ email: 'Please enter your email address.' }); return }
    if (!isValidEmail(t)) { setErrors({ email: 'Please enter a valid email address.' }); return }
    if (!password) { setErrors({ password: 'Please enter your password.' }); return }

    setLoading(true)
    let res
    try {
      res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: t, encryptedPassword: await encryptPassword(password) }),
      })
    } catch {
      setLoading(false)
      setErrors({ form: 'Network error. Please try again.' })
      return
    }
    let data
    try {
      data = await res.json()
    } catch {
      // Response body was not valid JSON — genuine network/server malfunction
      setLoading(false)
      setErrors({ form: 'Network error. Please try again.' })
      return
    }
    if (res.ok && data.success) {
      setLoading(false)
      onVerified(data.data.user)
    } else {
      setLoading(false)
      setErrors({ form: data.error || 'Something went wrong. Please try again.' })
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5" noValidate>
      <div>
        <Input
          label="Email address"
          type="email"
          inputMode="email"
          autoComplete="email"
          placeholder="Enter your email address"
          value={value}
          onChange={(e) => { setValue(e.target.value); setErrors((prev) => ({ ...prev, email: '', form: '' })) }}
          error={errors.email}
          className="text-base"
        />
      </div>
      <Input label="Password" type="password" autoComplete="current-password" placeholder="Enter your password" value={password} onChange={(e) => { setPassword(e.target.value); setErrors((prev) => ({ ...prev, password: '', form: '' })) }} error={errors.password} className="text-base" />
      {errors.form ? <p role="alert" className="text-sm text-bloom">{errors.form}</p> : null}
      <Button type="submit" className="w-full" disabled={loading}>
        {loading ? 'Signing in…' : 'Sign in'}
      </Button>
      <div className="border-t border-sand pt-6 text-center">
        <p className="text-sm text-muted">New to Jamae&apos;s Craftopia?</p>
        <button
          type="button"
          onClick={onSwitchToSignup}
          className="mt-1 inline-block text-sm font-semibold text-plum underline underline-offset-4 decoration-bloom/40 hover:decoration-bloom transition"
        >
          Create an account
        </button>
      </div>
    </form>
  )
}

// ─── Signup step ──────────────────────────────────────────────────────────────
function SignupStep({ onSwitchToLogin, onVerified }) {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [mobile, setMobile] = useState('')
  const [password, setPassword] = useState('')
  const [errors, setErrors] = useState({})
  const [loading, setLoading] = useState(false)

  function validate() {
    const e = {}
    if (!name.trim() || name.trim().length < 2) {
      e.name = 'Please enter your full name.'
    } else if (!/^[a-zA-Z\s'.-]+$/.test(name.trim())) {
      e.name = 'Please enter a valid name.'
    }
    if (!email.trim()) {
      e.email = 'Please enter your email address.'
    } else if (!isValidEmail(email)) {
      e.email = 'Please enter a valid email address.'
    }
    if (!mobile.trim()) {
      e.mobile = 'Please enter your mobile number.'
    } else if (!isValidMobile(mobile)) {
      e.mobile = 'Please enter a valid mobile number (10–15 digits).'
    }
    if (password.length < 8 || !/[A-Z]/.test(password) || !/[a-z]/.test(password) || !/[0-9]/.test(password)) {
      e.password = 'Use at least 8 characters with uppercase, lowercase, and a number.'
    }
    return e
  }

  async function handleSubmit(e) {
    e.preventDefault()
    const errs = validate()
    if (Object.keys(errs).length > 0) { setErrors(errs); return }
    setLoading(true)
    let res
    try {
      res = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim(),
          mobile: mobile.replace(/\D/g, ''),
          encryptedPassword: await encryptPassword(password),
        }),
      })
    } catch {
      setLoading(false)
      setErrors({ _form: 'Network error. Please try again.' })
      return
    }
    let data
    try {
      data = await res.json()
    } catch {
      setLoading(false)
      setErrors({ _form: 'Network error. Please try again.' })
      return
    }
    if (res.ok && data.success) {
      setLoading(false)
      onVerified({ challengeId: data.data.challengeId, email: data.data.email, name })
    } else {
      setLoading(false)
      if (data.errors) {
        setErrors(data.errors)
      } else {
        setErrors({ _form: data.error || 'Something went wrong. Please try again.' })
      }
    }
  }

  function clearError(field) {
    setErrors(prev => { const n = { ...prev }; delete n[field]; return n })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4" noValidate>
      <div>
        <Input
          label="Full name"
          type="text"
          autoComplete="name"
          placeholder="Enter your full name"
          value={name}
          onChange={(e) => { setName(e.target.value); clearError('name') }}
          error={errors.name}
          className="text-base"
        />
      </div>
      <div>
        <Input label="Password" type="password" autoComplete="new-password" placeholder="At least 8 characters" value={password} onChange={(e) => { setPassword(e.target.value); clearError('password') }} error={errors.password} className="text-base" />
      </div>
      <div>
        <Input
          label="Email address"
          type="email"
          autoComplete="email"
          placeholder="Enter your email address"
          value={email}
          onChange={(e) => { setEmail(e.target.value); clearError('email') }}
          error={errors.email}
          className="text-base"
        />
      </div>
      <div>
        <Input
          label="Mobile number"
          type="tel"
          inputMode="tel"
          autoComplete="tel-national"
          placeholder="Enter your mobile number"
          value={mobile}
          onChange={(e) => { setMobile(e.target.value); clearError('mobile') }}
          error={errors.mobile}
          className="text-base"
        />
      </div>
      {errors._form && (
        <p role="alert" className="text-sm font-medium text-bloom">{errors._form}</p>
      )}
      <Button type="submit" className="w-full" disabled={loading}>
        {loading ? 'Creating...' : 'Create Account'}
      </Button>
      <div className="border-t border-sand pt-5 text-center">
        <p className="text-sm text-muted">Already have an account?</p>
        <button
          type="button"
          onClick={onSwitchToLogin}
          className="mt-1 inline-block text-sm font-semibold text-plum underline underline-offset-4 decoration-bloom/40 hover:decoration-bloom transition"
        >
          Log in
        </button>
      </div>
    </form>
  )
}

// ─── Verify step ──────────────────────────────────────────────────────────────
function VerifyStep({ challengeId, email, isSignup, onBack, onVerified }) {
  const [otp, setOtp] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [resendCooldown, setResendCooldown] = useState(30)
  const [resendLoading, setResendLoading] = useState(false)

  useEffect(() => {
    if (!resendCooldown) return undefined
    const timer = setTimeout(() => setResendCooldown((current) => Math.max(0, current - 1)), 1000)
    return () => clearTimeout(timer)
  }, [resendCooldown])

  async function handleResend() {
    if (resendCooldown || resendLoading) return
    setError('')
    setResendLoading(true)
    try {
      const response = await fetch('/api/auth/otp', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ challengeId }),
      })
      const result = await response.json()
      if (!response.ok || !result.success) throw new Error(result.error || 'Could not resend the code.')
      setOtp('')
      setResendCooldown(30)
    } catch (e) {
      setError(e.message || 'Could not resend the code.')
    } finally {
      setResendLoading(false)
    }
  }

  async function handleVerify(e) {
    e.preventDefault()
    setError('')
    if (otp.replace(/\D/g, '').length < OTP_LENGTH) {
      setError('Please enter the complete verification code.')
      return
    }
    setLoading(true)
    let res
    try {
      res = await fetch('/api/auth/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ otp: otp.replace(/\D/g, ''), challengeId }),
      })
    } catch {
      setLoading(false)
      setError('Network error. Please try again.')
      return
    }
    let data
    try {
      data = await res.json()
    } catch {
      setLoading(false)
      setError('Network error. Please try again.')
      return
    }
    if (res.ok && data.success) {
      setLoading(false)
      onVerified(data.data.user)
    } else {
      setLoading(false)
      setError(data.error || 'Incorrect or expired code. Please try again.')
    }
  }

  return (
    <form onSubmit={handleVerify} className="space-y-6" noValidate>
      <p className="text-muted">
        Enter the verification code sent to{' '}
        <span className="font-medium text-plum">{formatMasked(email)}</span>.
      </p>
      <div>
        <OtpInput value={otp} onChange={setOtp} error={!!error} />
        {error && (
          <p role="alert" className="mt-3 text-center text-sm font-medium text-bloom">{error}</p>
        )}
      </div>
      <Button type="submit" className="w-full" disabled={loading}>
        {loading ? 'Verifying...' : isSignup ? 'Verify & Create Account' : 'Verify & Log In'}
      </Button>
      <div className="flex flex-col items-center gap-3 text-center">
        {resendCooldown > 0 ? <p className="text-sm text-muted">Resend in {resendCooldown}s</p> : <button type="button" onClick={handleResend} disabled={resendLoading} className="text-sm font-semibold text-bloom underline underline-offset-4 disabled:opacity-50">{resendLoading ? 'Sending…' : 'Resend code'}</button>}
        <button
          type="button"
          onClick={onBack}
          className="text-sm text-muted hover:text-plum transition"
        >
          Change email or mobile
        </button>
      </div>
    </form>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default function LoginPage() {
  // mode: 'login' | 'signup' | 'verify'
  const [mode, setMode] = useState('login')
  const [verifyData, setVerifyData] = useState(null)
  const userLogin = useUserStore((s) => s.login)
  const router = useRouter()

  function handleSwitchToSignup() {
    setMode('signup')
    setVerifyData(null)
  }

  function handleSwitchToLogin() {
    setMode('login')
    setVerifyData(null)
  }

  function handleVerified(data) {
    userLogin({ email: data.email, name: data.name, userId: data.id })
    const redirect = new URLSearchParams(window.location.search).get('redirect')
    router.replace(redirect?.startsWith('/') ? redirect : data.role === 'ADMIN' ? '/admin' : '/orders/me')
  }

  function handleVerifyBack() {
    setMode(verifyData?.type === 'signup' ? 'signup' : 'login')
    setVerifyData(null)
  }

  function handleSignupStarted(data) {
    setVerifyData({ ...data, type: 'signup' })
    setMode('verify')
  }

  const isVerifySignup = verifyData?.type === 'signup'

  return (
    <div className="container-page flex min-h-[calc(100vh-4.5rem)] items-center justify-center px-4 py-16">
      <div className="w-full max-w-md">
        {/* Brand */}
        <div className="mb-8 flex flex-col items-center gap-3 text-center">
          <Link href="/" className="flex items-center gap-2.5 text-plum transition hover:opacity-80" aria-label="Jamae&apos;s Craftopia home">
            <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-blush/80">
              <FlowerBurst className="h-6 w-6 text-bloom" />
            </span>
            <span className="leading-tight">
              <span className="block font-display text-lg">Jamae&apos;s</span>
              <span className="-mt-1 block text-[0.65rem] font-semibold uppercase tracking-[0.22em] text-muted">
                Craftopia
              </span>
            </span>
          </Link>
        </div>

        <AuthCard>
          {/* Back button for verify step */}
          {mode === 'verify' && (
            <button
              type="button"
              onClick={handleVerifyBack}
              className="mb-6 inline-flex items-center gap-1.5 text-sm font-semibold text-muted transition hover:text-plum"
            >
              <ArrowLeft className="h-4 w-4" />
              Back
            </button>
          )}

          {mode === 'login' && (
            <>
              <h1 className="heading-display text-3xl">Welcome Back</h1>
              <p className="mt-2 text-muted">Enter your email or mobile number to continue.</p>
              <div className="mt-8">
                <LoginStep
                  onSwitchToSignup={handleSwitchToSignup}
                  onVerified={handleVerified}
                />
              </div>
            </>
          )}

          {mode === 'signup' && (
            <>
              <h1 className="heading-display text-3xl">Create your account</h1>
              <p className="mt-2 text-muted">Join Jamae&apos;s Craftopia for a more personal experience.</p>
              <div className="mt-8">
                <SignupStep
                  onSwitchToLogin={handleSwitchToLogin}
                  onVerified={handleSignupStarted}
                />
              </div>
            </>
          )}

          {mode === 'verify' && verifyData && (
            <>
              <h1 className="heading-display text-3xl">
                {isVerifySignup ? 'Verify your account' : 'Enter the OTP'}
              </h1>
              <div className="mt-8">
                <VerifyStep
                  challengeId={verifyData.challengeId}
                  email={verifyData.email}
                  isSignup={isVerifySignup}
                  onBack={handleVerifyBack}
                  onVerified={handleVerified}
                />
              </div>
            </>
          )}
        </AuthCard>

        <p className="mt-6 text-center text-xs text-muted">
          By continuing, you agree to our terms and privacy policy.
        </p>
      </div>
    </div>
  )
}

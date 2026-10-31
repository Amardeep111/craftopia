'use client'

import { useState } from 'react'
import { ShieldCheck, AlertCircle } from 'lucide-react'
import Input from '@/components/ui/Input'
import Button from '@/components/ui/Button'
import {
  formatCardNumber,
  formatExpiry,
  validateCardNumber,
  validateExpiry,
  validateCvv,
  validateCardholderName,
  stripCardDigits,
} from '@/lib/payment'
import { formatPrice } from '@/data/products'

export default function CardForm({ total, testMode, onSubmit, loading, error }) {
  const [form, setForm] = useState({
    number: '',
    expiry: '',
    cvv: '',
    name: '',
  })
  const [touched, setTouched] = useState({ number: false, expiry: false, cvv: false, name: false })

  const [errors, setErrors] = useState({})

  function handleChange(key, value) {
    let next = value
    if (key === 'number') next = formatCardNumber(value)
    else if (key === 'expiry') next = formatExpiry(value)
    else if (key === 'cvv') next = value.replace(/\D/g, '').slice(0, 4)
    else if (key === 'name') next = value.replace(/[0-9]/g, '').slice(0, 30)

    setForm((prev) => ({ ...prev, [key]: next }))
    if (touched[key]) {
      setErrors((prev) => ({ ...prev, [key]: validateField(key, next) }))
    }
  }

  function handleBlur(key) {
    setTouched((prev) => ({ ...prev, [key]: true }))
    setErrors((prev) => ({ ...prev, [key]: validateField(key, form[key]) }))
  }

  function validateField(key, value) {
    switch (key) {
      case 'number': return validateCardNumber(value)
      case 'expiry': return validateExpiry(value)
      case 'cvv': return validateCvv(value)
      case 'name': return validateCardholderName(value)
      default: return ''
    }
  }

  function handleSubmit(e) {
    e.preventDefault()
    const allTouched = { number: true, expiry: true, cvv: true, name: true }
    setTouched(allTouched)

    const nextErrors = {
      number: validateField('number', form.number),
      expiry: validateField('expiry', form.expiry),
      cvv: validateField('cvv', form.cvv),
      name: validateField('name', form.name),
    }
    setErrors(nextErrors)

    const allValid = Object.values(nextErrors).every((v) => !v)
    if (allValid) {
      onSubmit({
        number: stripCardDigits(form.number),
        expiry: form.expiry,
        cvv: form.cvv,
        name: form.name.trim(),
      })
    }
  }

  const isValid =
    !validateField('number', form.number) &&
    !validateField('expiry', form.expiry) &&
    !validateField('cvv', form.cvv) &&
    !validateField('name', form.name)

  return (
    <div>
      {testMode && (
        <div className="mb-4 flex items-start gap-2 rounded-xl bg-peach/30 border border-peach/50 p-3 text-sm">
          <AlertCircle className="h-4 w-4 text-bloom shrink-0 mt-0.5" aria-hidden="true" />
          <p className="text-plum">
            <strong>Test mode.</strong> Use test card numbers (e.g. 4111 1111 1111 1111) for validation; no real charge will occur.
          </p>
        </div>
      )}

      <form onSubmit={handleSubmit} noValidate>
        <Input
          label="Card Number"
          placeholder="0000 0000 0000 0000"
          value={form.number}
          onChange={(e) => handleChange('number', e.target.value)}
          onBlur={() => handleBlur('number')}
          error={touched.number ? errors.number : ''}
          autoComplete="cc-number"
          aria-describedby={errors.number ? 'card-number-error' : undefined}
        />

        <div className="grid grid-cols-2 gap-4 mt-4">
          <Input
            label="Expiry (MM/YY)"
            placeholder="MM / YY"
            value={form.expiry}
            onChange={(e) => handleChange('expiry', e.target.value)}
            onBlur={() => handleBlur('expiry')}
            error={touched.expiry ? errors.expiry : ''}
            autoComplete="cc-exp"
          />
          <Input
            label="CVV"
            placeholder="***"
            value={form.cvv}
            onChange={(e) => handleChange('cvv', e.target.value)}
            onBlur={() => handleBlur('cvv')}
            error={touched.cvv ? errors.cvv : ''}
            autoComplete="cc-csc"
            type="password"
          />
        </div>

        <div className="mt-4">
          <Input
            label="Cardholder Name"
            placeholder="Name on card"
            value={form.name}
            onChange={(e) => handleChange('name', e.target.value)}
            onBlur={() => handleBlur('name')}
            error={touched.name ? errors.name : ''}
            autoComplete="cc-name"
          />
        </div>

        <div className="mt-4 flex items-center gap-2 text-xs text-muted">
          <ShieldCheck className="h-4 w-4 text-sage shrink-0" aria-hidden="true" />
          <span>Your card information is protected and is never stored by us.</span>
        </div>

        {error && (
          <p className="mt-3 text-sm text-bloom" role="alert">{error}</p>
        )}

        <div className="mt-5">
          <Button
            type="submit"
            disabled={loading || !isValid}
            className="w-full"
            size="lg"
          >
            {loading ? 'Processing…' : `Pay ${formatPrice(total)}`}
          </Button>
        </div>
      </form>
    </div>
  )
}
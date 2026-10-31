'use client'

import { useState } from 'react'
import { Landmark, ArrowRight, AlertCircle } from 'lucide-react'
import Select from '@/components/ui/Select'
import Button from '@/components/ui/Button'
import { validateBankSelection } from '@/lib/payment'
import { formatPrice } from '@/data/products'

const BANK_OPTIONS = [
  { value: 'hdfc', label: 'HDFC Bank' },
  { value: 'icici', label: 'ICICI Bank' },
  { value: 'sbi', label: 'State Bank of India' },
  { value: 'axis', label: 'Axis Bank' },
  { value: 'kotak', label: 'Kotak Mahindra Bank' },
  { value: 'indusind', label: 'IndusInd Bank' },
  { value: 'bob', label: 'Bank of Baroda' },
  { value: 'pnb', label: 'Punjab National Bank' },
  { value: 'other', label: 'Other Banks' },
]

export default function NetBankingForm({ total, testMode, onSubmit, loading, error }) {
  const [bank, setBank] = useState('')
  const [touched, setTouched] = useState(false)

  function handleSelect(value) {
    setBank(value)
  }

  function handleBlur() {
    setTouched(true)
  }

  function handleSubmit(e) {
    e.preventDefault()
    setTouched(true)
    const err = validateBankSelection(bank)
    if (err) return
    onSubmit({ bank })
  }

  const bankError = touched ? validateBankSelection(bank) : ''

  return (
    <div>
      {testMode && (
        <div className="mb-4 flex items-start gap-2 rounded-xl bg-peach/30 border border-peach/50 p-3 text-sm">
          <AlertCircle className="h-4 w-4 text-bloom shrink-0 mt-0.5" aria-hidden="true" />
          <p className="text-plum">
            <strong>Test mode.</strong> Select any bank below; no real bank redirect will occur until a gateway is wired.
          </p>
        </div>
      )}

      <form onSubmit={handleSubmit} noValidate>
        <Select
          value={bank}
          onChange={handleSelect}
          options={BANK_OPTIONS}
          placeholder="Select your bank"
          label="Select your bank"
          error={!!bankError}
          aria-describedby={bankError ? 'bank-error' : undefined}
        />
        {bankError && (
          <p id="bank-error" className="mt-1.5 text-sm text-bloom">{bankError}</p>
        )}

        <div className="mt-5 flex items-center gap-2 text-xs text-muted">
          <Landmark className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          <span>You will be redirected to your bank's secure login page.</span>
        </div>

        {error && (
          <p className="mt-3 text-sm text-bloom" role="alert">{error}</p>
        )}

        <div className="mt-5">
          <Button
            type="submit"
            disabled={loading || !bank}
            className="w-full"
            size="lg"
          >
            {loading ? 'Preparing…' : `Continue to Bank — ${formatPrice(total)}`}
          </Button>
        </div>
      </form>
    </div>
  )
}
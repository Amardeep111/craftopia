'use client'

import { Check } from 'lucide-react'
import Link from 'next/link'

const STEPS = [
  { id: 'address',  label: 'Address',   href: '/checkout/address' },
  { id: 'summary',  label: 'Order Summary', href: '/checkout' },
  { id: 'payment',  label: 'Payment',   href: '/checkout/payment' },
]

export default function CheckoutProgress({ current = 'address' }) {
  const normalizedCurrent = current === 'coupon' ? 'summary' : current
  const currentIdx = STEPS.findIndex((s) => s.id === normalizedCurrent)

  return (
    <nav aria-label="Checkout steps" className="flex items-center justify-center gap-0">
      {STEPS.map((step, i) => {
        const isDone = i < currentIdx
        const isActive = i === currentIdx
        const isPending = i > currentIdx

        return (
          <div key={step.id} className="flex items-center">
            {/* Step bubble + label */}
            <div className="flex flex-col items-center gap-1">
              <div
                className={`
                  flex h-8 w-8 items-center justify-center rounded-full border-2 text-sm font-bold transition-all
                  ${isDone  ? 'border-bloom bg-bloom text-cream' : ''}
                  ${isActive ? 'border-bloom bg-bloom text-cream shadow-soft' : ''}
                  ${isPending ? 'border-sand bg-cream text-sand' : ''}
                `}
              >
                {isDone ? (
                  <Check className="h-4 w-4" aria-hidden="true" />
                ) : (
                  <span>{i + 1}</span>
                )}
              </div>
              <span
                className={`
                  whitespace-nowrap text-xs font-semibold transition-colors
                  ${isActive ? 'text-bloom' : ''}
                  ${isDone  ? 'text-sage' : ''}
                  ${isPending ? 'text-sand' : ''}
                `}
              >
                {step.label}
              </span>
            </div>

            {/* Connector line */}
            {i < STEPS.length - 1 && (
              <div
                className={`
                  mx-1 h-0.5 w-8 sm:w-12 transition-colors
                  ${i < currentIdx ? 'bg-bloom' : 'bg-sand'}
                `}
                aria-hidden="true"
              />
            )}
          </div>
        )
      })}
    </nav>
  )
}

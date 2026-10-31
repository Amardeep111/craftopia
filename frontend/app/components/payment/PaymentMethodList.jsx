'use client'

import { Smartphone, CreditCard, Landmark, Truck, Check } from 'lucide-react'
import { PAYMENT_METHODS, PAYMENT_METHOD_ORDER } from '@/lib/payment'

const ICONS = {
  upi: Smartphone,
  card: CreditCard,
  net_banking: Landmark,
  cod: Truck,
}

export default function PaymentMethodList({ selected, onSelect, availableMethods = PAYMENT_METHOD_ORDER }) {
  const methods = PAYMENT_METHOD_ORDER.filter((id) => availableMethods.includes(id))
  if (!methods.length) return <p role="alert" className="rounded-xl bg-peach/30 p-4 text-sm text-plum">The items in your cart have different payment restrictions. Please place them in separate orders.</p>
  return (
    <ul role="radiogroup" aria-label="Choose a payment method" className="space-y-2.5">
      {methods.map((id) => {
        const method = PAYMENT_METHODS[id]
        const Icon = ICONS[id] || CreditCard
        const isSelected = selected === id

        return (
          <li key={id}>
            <button
              type="button"
              role="radio"
              aria-checked={isSelected}
              aria-labelledby={`pm-${id}-label`}
              aria-describedby={`pm-${id}-desc`}
              onClick={() => onSelect(id)}
              className={`
                group w-full text-left rounded-2xl border transition duration-200
                flex items-center gap-3 sm:gap-4 px-4 py-3.5 sm:py-4
                ${isSelected
                  ? 'border-bloom bg-bloom/5 ring-2 ring-bloom/20 shadow-soft'
                  : 'border-sand/70 bg-ivory/70 hover:border-blush/80 hover:bg-blush/30'
                }
              `}
            >
              <span
                className={`
                  flex h-11 w-11 shrink-0 items-center justify-center rounded-xl transition
                  ${isSelected ? 'bg-bloom text-cream' : 'bg-cream text-plum ring-1 ring-sand group-hover:ring-bloom/30'}
                `}
                aria-hidden="true"
              >
                <Icon className="h-5 w-5" />
              </span>
              <span className="min-w-0 flex-1">
                <span
                  id={`pm-${id}-label`}
                  className={`block font-display text-base sm:text-lg font-semibold ${isSelected ? 'text-plum' : 'text-plum'}`}
                >
                  {method.label}
                </span>
                <span id={`pm-${id}-desc`} className="block text-xs sm:text-sm text-muted">
                  {method.description}
                </span>
              </span>
              <span
                className={`
                  flex h-5 w-5 shrink-0 items-center justify-center rounded-full transition
                  ${isSelected ? 'bg-bloom text-cream' : 'border border-sand text-transparent group-hover:border-bloom/50'}
                `}
                aria-hidden="true"
              >
                <Check className="h-3 w-3" />
              </span>
            </button>
          </li>
        )
      })}
    </ul>
  )
}

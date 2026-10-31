'use client'

import { Truck, CheckCircle } from 'lucide-react'
import Button from '@/components/ui/Button'
import { formatPrice } from '@/data/products'

export default function CodForm({ total, fee, onSubmit, loading, error }) {
  const hasFee = Number(fee) > 0

  return (
    <div>
      <div className="rounded-2xl bg-ivory/70 border border-sand/60 p-5">
        <div className="flex items-center gap-3 mb-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-bloom/10 text-bloom">
            <Truck className="h-5 w-5" aria-hidden="true" />
          </div>
          <h3 className="font-display text-xl text-plum">Cash on Delivery</h3>
        </div>
        <p className="text-sm text-muted leading-relaxed">
          Pay when your order is delivered to your address. No pre-payment required.
        </p>

        <div className="mt-4 space-y-2 text-sm border-t border-sand/60 pt-3">
          <div className="flex justify-between">
            <span className="text-muted">Order amount</span>
            <span className="font-semibold text-plum">{formatPrice(total)}</span>
          </div>
          {hasFee ? (
            <div className="flex justify-between text-bloom">
              <span>COD handling fee</span>
              <span>+{formatPrice(fee)}</span>
            </div>
          ) : (
            <div className="flex justify-between text-sage font-medium">
              <span>COD fee</span>
              <span>Free</span>
            </div>
          )}
          <div className="flex justify-between border-t border-sand/60 pt-2 mt-2">
            <span className="font-medium text-plum">Total payable</span>
            <span className="font-display text-xl text-plum">{formatPrice(total + fee)}</span>
          </div>
        </div>
      </div>

      <div className="mt-3 flex items-start gap-2 text-xs text-muted">
        <CheckCircle className="h-4 w-4 text-sage shrink-0 mt-0.5" aria-hidden="true" />
        <p>A delivery partner will bring the package and collect payment. You can inspect the order before paying.</p>
      </div>

      {error && (
        <p className="mt-3 text-sm text-bloom" role="alert">{error}</p>
      )}

      <div className="mt-5">
        <Button
          type="button"
          onClick={() => onSubmit()}
          disabled={loading}
          className="w-full"
          size="lg"
        >
          {loading ? 'Placing order…' : `Place Order — ${formatPrice(total + fee)}`}
        </Button>
      </div>
    </div>
  )
}

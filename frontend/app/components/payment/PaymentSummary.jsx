'use client'

import { ShoppingBag, Tag, Truck, Lock } from 'lucide-react'
import { formatPrice } from '@/data/products'
import { useCartStore } from '@/lib/cart'
import { useCouponStore, couponDiscountAmount } from '@/lib/coupon'

export default function PaymentSummary({ method }) {
  const items = useCartStore((s) => s.items)
  const coupon = useCouponStore((s) => s.coupon)

  const subtotal = items.reduce((sum, i) => sum + i.price * i.quantity, 0)
  const totalItems = items.reduce((sum, i) => sum + i.quantity, 0)
  const discount = couponDiscountAmount(coupon, subtotal)
  const gstTotal = items.reduce((sum, item) => sum + (item.gstAmount || Math.round(item.price * (item.gstPercent || 0) / 100)) * item.quantity, 0)
  const otherChargeTotal = items.reduce((sum, item) => sum + (item.otherCharge || 0) * item.quantity, 0)
  const codFee = method === 'cod' ? items.reduce((sum, item) => sum + (item.codFee || 0) * item.quantity, 0) : 0
  const shipping = subtotal >= 999 ? 0 : 49
  const total = subtotal - discount + shipping + gstTotal + otherChargeTotal + codFee

  return (
    <aside className="paper-card p-5 sm:p-6 sticky top-6">
      <h3 className="font-display text-xl text-plum mb-1">Price Details</h3>

      <div className="mt-5 space-y-2 text-sm">
        {/* Item lines */}
        <div className="flex justify-between">
          <span className="flex items-center gap-1.5 text-muted">
            <ShoppingBag className="h-3.5 w-3.5" />
            Items
          </span>
          <span className="font-semibold text-plum">{totalItems}</span>
        </div>

        <div className="flex justify-between">
          <span className="text-muted">Subtotal</span>
          <span className="font-semibold text-plum">{formatPrice(subtotal)}</span>
        </div>

        {discount > 0 && (
          <div className="flex justify-between">
            <span className="flex items-center gap-1.5 text-bloom">
              <Tag className="h-3.5 w-3.5" />
              Coupon ({coupon?.code})
            </span>
            <span className="font-semibold text-bloom">−{formatPrice(discount)}</span>
          </div>
        )}

        {gstTotal > 0 && <div className="flex justify-between"><span className="text-muted">GST</span><span className="font-semibold text-plum">+{formatPrice(gstTotal)}</span></div>}
        {otherChargeTotal > 0 && <div className="flex justify-between"><span className="text-muted">Other product charges</span><span className="font-semibold text-plum">+{formatPrice(otherChargeTotal)}</span></div>}

        <div className="flex justify-between">
          <span className="text-muted">Shipping</span>
          <span className="font-semibold text-plum">{shipping ? `+${formatPrice(shipping)}` : 'Free'}</span>
        </div>

        {method === 'cod' && codFee > 0 && (
          <div className="flex justify-between">
            <span className="text-muted">COD handling fee</span>
            <span className="font-semibold text-bloom">+{formatPrice(codFee)}</span>
          </div>
        )}

        {method && method !== 'cod' && (
          <div className="flex justify-between text-muted text-xs italic">
            <span>No extra charges</span>
          </div>
        )}

        {/* Divider */}
        <div className="border-t border-sand pt-2 mt-2" />

        {/* Final total */}
        <div className="flex justify-between">
          <span className="font-medium text-plum">Total Payable</span>
          <span className="font-display text-xl text-plum">{formatPrice(total)}</span>
        </div>
      </div>

      {/* Delivery info */}
      <div className="mt-5 flex items-start gap-2 rounded-xl bg-ivory/60 p-3 text-xs text-muted">
        <Truck className="h-4 w-4 text-bloom shrink-0 mt-0.5" aria-hidden="true" />
        <p>Handmade pieces — ships within 3–5 days of order confirmation.</p>
      </div>

      {/* Security note */}
      <div className="mt-3 flex items-center gap-2 text-xs text-muted/70">
        <Lock className="h-3.5 w-3.5" aria-hidden="true" />
        <span>Secure payment</span>
      </div>
    </aside>
  )
}

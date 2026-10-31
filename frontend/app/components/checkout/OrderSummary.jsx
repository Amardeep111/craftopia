'use client'

import { useEffect } from 'react'
import { ShoppingBag, Tag, Truck } from 'lucide-react'
import { formatPrice } from '@/data/products'
import { useCartStore } from '@/lib/cart'
import { useCouponStore, couponDiscountAmount } from '@/lib/coupon'
import ProductImage from '@/components/ui/ProductImage'

export default function OrderSummary() {
  const items = useCartStore((s) => s.items)
  const coupon = useCouponStore((s) => s.coupon)

  const totalPrice = items.reduce((sum, i) => sum + i.price * i.quantity, 0)
  const totalItems = items.reduce((sum, i) => sum + i.quantity, 0)

  useEffect(() => {
    const store = useCouponStore.getState()
    if (store.coupon && store.revalidate) {
      store.revalidate(totalPrice)
    }
  }, [totalPrice, items])

  const discount = couponDiscountAmount(coupon, totalPrice)
  const gstTotal = items.reduce((sum, item) => sum + (item.gstAmount || Math.round(item.price * (item.gstPercent || 0) / 100)) * item.quantity, 0)
  const codFeeTotal = items.reduce((sum, item) => sum + (item.codFee || 0) * item.quantity, 0)
  const otherChargeTotal = items.reduce((sum, item) => sum + (item.otherCharge || 0) * item.quantity, 0)
  const finalTotal = Math.max(0, totalPrice - discount + gstTotal + otherChargeTotal)

  return (
    <aside className="paper-card p-6 sticky top-6">
      <h3 className="font-display text-xl text-plum mb-1">Order summary</h3>
      <p className="text-xs text-muted mb-4">Your bag is preserved across checkout steps.</p>

      <ul className="divide-y divide-sand">
        {items.map((item) => (
          <li key={item.id} className="flex items-center gap-3 py-3">
            <div className="relative rounded-full h-12 w-12 shrink-0 overflow-hidden bg-gradient-to-br from-blush/40 to-bloom/20 ring-1 ring-sand flex items-center justify-center">
              <ProductImage
                src={item.imageUrl || (typeof item.visual === 'string' && item.visual.startsWith('http') ? item.visual : item.image)}
                visual={typeof item.visual === 'string' && !item.visual.startsWith('http') ? item.visual : 'yarn'}
                palette={item.palette}
                alt={item.name}
                fit="cover"
                className="h-full w-full"
                imgClassName="object-cover"
              />
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-semibold text-plum truncate">{item.name}</p>
              <p className="text-xs text-muted">Qty: {item.quantity}</p>
            </div>
            <p className="font-semibold text-plum text-sm whitespace-nowrap">{formatPrice(item.price * item.quantity)}</p>
          </li>
        ))}
        {items.length === 0 && (
          <li className="py-3 text-sm text-muted">Your bag is empty.</li>
        )}
      </ul>

      <div className="mt-5 space-y-2 text-sm">
        <div className="flex justify-between text-muted">
          <span className="flex items-center gap-2"><ShoppingBag className="h-3.5 w-3.5" /> Items</span>
          <span>{totalItems}</span>
        </div>
        <div className="flex justify-between text-plum font-semibold">
          <span>Subtotal</span>
          <span>{formatPrice(totalPrice)}</span>
        </div>
        {discount > 0 && (
          <div className="flex justify-between text-emerald-700 font-semibold bg-emerald-50 px-2.5 py-1.5 rounded-lg">
            <span className="flex items-center gap-1.5">
              <Tag className="h-3.5 w-3.5" />
              Coupon discount ({coupon.code})
            </span>
            <span>-{formatPrice(discount)}</span>
          </div>
        )}
        {gstTotal > 0 && <div className="flex justify-between text-muted"><span>GST</span><span>+{formatPrice(gstTotal)}</span></div>}
        {otherChargeTotal > 0 && <div className="flex justify-between text-muted"><span>Other product charges</span><span>+{formatPrice(otherChargeTotal)}</span></div>}
        {codFeeTotal > 0 && <div className="flex justify-between text-muted"><span>COD fees (if selected)</span><span>+{formatPrice(codFeeTotal)}</span></div>}
        <div className="border-t border-sand pt-2 mt-2 flex justify-between">
          <span className="font-medium text-plum">Before shipping / COD</span>
          <span className="font-display text-xl text-plum">{formatPrice(finalTotal)}</span>
        </div>
      </div>

      {/* Note: Coupon application is in Order Summary */}
      <div className="mt-5 rounded-2xl bg-ivory/80 p-3.5 ring-1 ring-sand/60 text-xs text-muted flex items-start gap-2.5">
        <Tag className="h-4 w-4 text-bloom shrink-0 mt-0.5" />
        <div>
          <p className="font-semibold text-plum">Coupons & Discounts</p>
          <p className="mt-0.5 leading-relaxed">
            You will be able to review, edit your items, and apply coupon codes at the next step (Order Summary).
          </p>
        </div>
      </div>

      <div className="mt-4 rounded-2xl bg-ivory/60 p-3 text-xs text-muted flex items-start gap-2">
        <Truck className="h-4 w-4 text-bloom shrink-0 mt-0.5" aria-hidden="true" />
        <p>Handmade pieces — ships within 3–5 days. Delivery address selected will be saved.</p>
      </div>
    </aside>
  )
}

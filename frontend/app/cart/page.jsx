'use client'

import { useEffect, useRef } from 'react'
import Link from 'next/link'
import { Trash2, Minus, Plus, ShoppingBag, ArrowLeft, Tag } from 'lucide-react'
import Button from '@/components/ui/Button'
import ProductImage from '@/components/ui/ProductImage'
import { formatPrice } from '@/data/products'
import { useCartStore } from '@/lib/cart'
import { api } from '@/lib/api/client'

export default function CartPage() {
  const items = useCartStore((s) => s.items)
  const removeItem = useCartStore((s) => s.removeItem)
  const updateQuantity = useCartStore((s) => s.updateQuantity)
  const updateItemPrices = useCartStore((s) => s.updateItemPrices)
  const clearBuyNow = useCartStore((s) => s.clearBuyNow)

  useEffect(() => {
    clearBuyNow?.()
  }, [clearBuyNow])

  const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0)
  const itemCount = items.reduce((sum, item) => sum + item.quantity, 0)
  const gstTotal = items.reduce((sum, item) => sum + (item.gstAmount || Math.round(item.price * (item.gstPercent || 0) / 100)) * item.quantity, 0)
  const codFeeTotal = items.reduce((sum, item) => sum + (item.codFee || 0) * item.quantity, 0)
  const otherChargeTotal = items.reduce((sum, item) => sum + (item.otherCharge || 0) * item.quantity, 0)
  const total = subtotal + gstTotal + otherChargeTotal

  const pricesChecked = useRef(false)

  useEffect(() => {
    if (!items.length || pricesChecked.current) return
    pricesChecked.current = true
    api.cart.validate(items.map(({ id, quantity }) => ({ productId: id, quantity })))
      .then((data) => {
        if (data && Array.isArray(data.items)) {
          updateItemPrices(data.items)
        }
      })
      .catch(() => {})
  }, [items, updateItemPrices])

  if (items.length === 0) {
    return (
      <div className="container-page pb-20 pt-10 text-center">
        <div className="mx-auto max-w-md rounded-3xl bg-ivory/60 p-10 shadow-sm">
          <ShoppingBag className="mx-auto h-14 w-14 text-accent" />
          <h1 className="heading-display mt-6 text-3xl">Your bag is empty</h1>
          <p className="mt-3 text-muted">Handmade pieces are waiting for you in the shop.</p>
          <Link href="/shop" className="mt-6 inline-flex rounded-full bg-plum px-5 py-2.5 text-sm font-semibold tracking-wide text-on-primary shadow-soft transition hover:bg-overlay-ink hover:-translate-y-0.5 hover:shadow-lift active:translate-y-0">
            Continue Shopping
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="container-page pb-20 pt-10">
      {/* Page header */}
      <div className="mb-8 flex items-center gap-3">
        <Link href="/shop" className="inline-flex items-center gap-1 text-sm font-semibold text-muted transition hover:text-brand">
          <ArrowLeft className="h-4 w-4" /> Shop
        </Link>
        <span aria-hidden="true">/</span>
        <h1 className="heading-display text-3xl">Your Bag</h1>
        <span className="ml-auto rounded-full bg-plum px-3 py-1 text-sm font-semibold text-on-primary">{itemCount} item{itemCount !== 1 ? 's' : ''}</span>
      </div>

      <div className="grid gap-10 lg:grid-cols-3">
        {/* Cart items */}
        <div className="lg:col-span-2 space-y-5">
          {items.map((item) => (
            <div key={item.id} className="paper-card flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:gap-5">
              {/* Product image */}
              <div className="h-28 w-28 shrink-0 overflow-hidden rounded-2xl bg-sand/40 relative">
                <ProductImage
                  src={
                    item.image ||
                    item.imageUrl ||
                    (Array.isArray(item.images) ? item.images[0] : null) ||
                    (typeof item.visual === 'string' && (item.visual.startsWith('http') || item.visual.startsWith('/'))
                      ? item.visual
                      : null)
                  }
                  visual={
                    typeof item.visual === 'string' && !item.visual.startsWith('http') && !item.visual.startsWith('/')
                      ? item.visual
                      : 'yarn'
                  }
                  palette={item.palette}
                  alt={item.name}
                  fit="cover"
                  className="h-full w-full"
                  imgClassName="object-cover"
                />
              </div>

              {/* Product info */}
              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="font-display text-xl text-brand">{item.name}</h3>
                    <p className="mt-0.5 flex flex-wrap items-center gap-2 text-sm font-semibold text-accent"><span>{formatPrice(item.price)} each</span>{item.discountPercent > 0 && <><span className="font-normal text-muted line-through">{formatPrice(item.originalPrice)}</span><span className="text-xs text-moss">{item.discountPercent}% off</span></>}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeItem(item.id)}
                    aria-label={`Remove ${item.name} from bag`}
                    className="rounded-full p-2 text-muted transition hover:text-accent hover:bg-sand"
                    title="Remove"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>

                <div className="mt-4 flex flex-wrap items-center gap-4">
                  {/* Quantity selector */}
                  <div className="inline-flex items-center rounded-full bg-ivory ring-1 ring-sand">
                    <button
                      type="button"
                      aria-label={`Decrease quantity of ${item.name}`}
                      onClick={() => {
                        if (item.quantity <= 1) {
                          removeItem(item.id)
                        } else {
                          updateQuantity(item.id, item.quantity - 1)
                        }
                      }}
                      className="p-2 text-brand transition hover:text-accent"
                    >
                      <Minus className="h-3.5 w-3.5" />
                    </button>
                    <span className="min-w-[1.75rem] text-center text-sm font-semibold" aria-live="polite">
                      {item.quantity}
                    </span>
                    <button
                      type="button"
                      aria-label={`Increase quantity of ${item.name}`}
                      onClick={() => updateQuantity(item.id, item.quantity + 1)}
                      className="p-2 text-brand transition hover:text-accent"
                    >
                      <Plus className="h-3.5 w-3.5" />
                    </button>
                  </div>

                  {/* Item subtotal */}
                  <span className="text-sm text-muted">
                    Subtotal:{' '}
                    <span className="font-semibold text-brand">{formatPrice(item.price * item.quantity)}</span>
                  </span>
                </div>
              </div>
            </div>
          ))}

          {/* Continue Shopping */}
          <div className="pt-2">
            <Link href="/shop" className="inline-flex items-center gap-1.5 rounded-full bg-ivory px-5 py-2.5 text-sm font-semibold text-brand shadow-soft ring-1 ring-blush/80 transition hover:bg-blush/60 hover:-translate-y-0.5 active:translate-y-0">
              <ArrowLeft className="h-4 w-4" /> Continue Shopping
            </Link>
          </div>
        </div>

        {/* Order summary */}
        <aside className="lg:col-span-1">
          <div className="paper-card p-6">
            <h2 className="font-display text-2xl text-brand">Order Summary</h2>

            <div className="mt-4 space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted">Subtotal</span>
                <span className="font-semibold text-brand">{formatPrice(subtotal)}</span>
              </div>

              {gstTotal > 0 && <div className="flex justify-between"><span className="text-muted">GST</span><span className="font-semibold text-brand">+{formatPrice(gstTotal)}</span></div>}
              {otherChargeTotal > 0 && <div className="flex justify-between"><span className="text-muted">Other product charges</span><span className="font-semibold text-brand">+{formatPrice(otherChargeTotal)}</span></div>}
              {codFeeTotal > 0 && <div className="flex justify-between"><span className="text-muted">COD fees (if selected)</span><span className="font-semibold text-brand">+{formatPrice(codFeeTotal)}</span></div>}

              <div className="flex justify-between">
                <span className="text-muted">Shipping</span>
                <span className="font-semibold text-brand">Calculated at checkout</span>
              </div>

              <div className="border-t border-sand pt-2 mt-2 flex justify-between">
                <span className="font-medium text-brand">Estimated Total</span>
                <span className="font-display text-xl text-brand">{formatPrice(total)}</span>
              </div>
            </div>

            {/* Note: Coupon is applied in Order Summary */}
            <div className="mt-5 rounded-2xl bg-ivory/80 p-3.5 ring-1 ring-sand/60 text-xs text-muted flex items-start gap-2.5">
              <Tag className="h-4 w-4 text-accent shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-brand">Coupons & Offers</p>
                <p className="mt-0.5 leading-relaxed">You can apply and choose your coupons during the Order Summary step.</p>
              </div>
            </div>

            <Link
              href="/checkout/address"
              onClick={() => clearBuyNow?.()}
              className="mt-5 flex w-full items-center justify-center rounded-full bg-plum px-5 py-2.5 text-sm font-semibold tracking-wide text-on-primary shadow-soft transition hover:bg-overlay-ink hover:-translate-y-0.5 hover:shadow-lift active:translate-y-0"
            >
              Proceed to Checkout
            </Link>
            <p className="mt-3 text-center text-xs text-muted">Handmade pieces — ships within 3–5 days.</p>
          </div>
        </aside>
      </div>
    </div>
  )
}

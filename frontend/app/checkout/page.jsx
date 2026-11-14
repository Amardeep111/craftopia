'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import {
  ArrowLeft,
  ArrowRight,
  Check,
  CheckCircle2,
  Minus,
  Plus,
  ShoppingBag,
  Sparkles,
  Tag,
  Trash2,
} from 'lucide-react'
import Button from '@/components/ui/Button'
import ProductImage from '@/components/ui/ProductImage'
import { formatPrice } from '@/data/products'
import { useCartStore, useCheckoutItems } from '@/lib/cart'
import { useAddressStore } from '@/lib/address'
import { useCouponStore, couponDiscountAmount } from '@/lib/coupon'
import CheckoutProgress from '@/components/checkout/CheckoutProgress'
import SkeletonCard from '@/components/ui/SkeletonCard'

export default function CheckoutPage() {
  const items = useCheckoutItems()
  const isBuyNow = useCartStore((s) => s.checkoutMode === 'buynow')
  const savedCartCount = useCartStore((s) => s.items.length)
  const updateQuantity = useCartStore((s) => s.updateQuantity)
  const removeItem = useCartStore((s) => s.removeItem)

  const coupon = useCouponStore((s) => s.coupon)
  const applyCoupon = useCouponStore((s) => s.apply)
  const removeCoupon = useCouponStore((s) => s.remove)
  const couponLoading = useCouponStore((s) => s.loading)
  const couponError = useCouponStore((s) => s.error)

  const [inputCode, setInputCode] = useState('')
  const [suggestions, setSuggestions] = useState([])
  const [ready, setReady] = useState(false)
  const [actionNotice, setActionNotice] = useState('')

  useEffect(() => {
    setTimeout(() => setReady(true), 50)
  }, [])

  const totalItems = items.reduce((sum, i) => sum + i.quantity, 0)
  const subtotal = items.reduce((sum, i) => sum + i.price * i.quantity, 0)

  // Revalidate coupon whenever cart subtotal changes (guard against running before items hydrate)
  useEffect(() => {
    const store = useCouponStore.getState()
    if (store.coupon && store.revalidate && subtotal > 0 && items.length > 0) {
      store.revalidate(subtotal)
    }
  }, [subtotal, items.length])

  // Fetch available coupons count / suggestions
  useEffect(() => {
    fetch('/api/coupons')
      .then(async (r) => {
        try {
          if (!r.ok) return
          const j = await r.json()
          if (j.success && Array.isArray(j.data)) {
            setSuggestions(j.data)
          }
        } catch {
          // Non-blocking
        }
      })
      .catch(() => {})
  }, [])

  const discount = couponDiscountAmount(coupon, subtotal)
  const gstTotal = items.reduce(
    (sum, item) =>
      sum +
      (item.gstAmount || Math.round((item.price * (item.gstPercent || 0)) / 100)) *
        item.quantity,
    0
  )
  const codFeeTotal = items.reduce((sum, item) => sum + (item.codFee || 0) * item.quantity, 0)
  const otherChargeTotal = items.reduce(
    (sum, item) => sum + (item.otherCharge || 0) * item.quantity,
    0
  )
  const finalTotal = Math.max(0, subtotal - discount + gstTotal + otherChargeTotal)
  const selectedAddress = useAddressStore((s) => s.getSelectedAddress())

  async function handleApply(e) {
    e?.preventDefault()
    const trimmed = inputCode.trim().toUpperCase()
    if (!trimmed) return
    setActionNotice('')
    const success = await applyCoupon(trimmed, subtotal)
    if (success) {
      setInputCode('')
      setActionNotice(`Coupon "${trimmed}" applied!`)
      setTimeout(() => setActionNotice(''), 3000)
    }
  }

  function handleRemove() {
    removeCoupon()
    setActionNotice('Coupon removed.')
    setTimeout(() => setActionNotice(''), 3000)
  }

  if (!ready) {
    return (
      <div className="container-page pb-20 pt-10">
        <div className="h-8 w-48 rounded bg-sand/50 animate-pulse mb-6" />
        <div className="grid gap-10 lg:grid-cols-[1fr_22rem] lg:items-start">
          <div className="space-y-5">
            <SkeletonCard />
            <SkeletonCard />
          </div>
          <aside>
            <div className="paper-card p-6 lg:sticky lg:top-6">
              <div className="h-8 w-32 rounded bg-sand/50 animate-pulse mb-4" />
              <div className="h-6 w-full rounded bg-sand/40 animate-pulse" />
            </div>
          </aside>
        </div>
      </div>
    )
  }

  if (items.length === 0) {
    return (
      <div className="container-page pb-20 pt-10 text-center">
        <div className="mx-auto max-w-md rounded-3xl bg-ivory/60 p-10 shadow-sm">
          <ShoppingBag className="mx-auto h-14 w-14 text-accent" />
          <h1 className="heading-display mt-6 text-3xl">Your bag is empty</h1>
          <p className="mt-3 text-muted">Add a piece from the shop before checking out.</p>
          <Button as={Link} href="/shop" className="mt-6 inline-flex" variant="secondary">
            Browse the shop
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="container-page pb-20 pt-10">
      <CheckoutProgress current="summary" />

      <div className="mt-6 mb-2 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Link
            href="/checkout/address"
            className="inline-flex items-center gap-1 text-sm font-semibold text-muted transition hover:text-brand"
          >
            <ArrowLeft className="h-4 w-4" /> Back to address
          </Link>
          <span aria-hidden="true" className="text-sand">/</span>
          <h1 className="font-display text-2xl sm:text-3xl text-brand">Order Summary & Review</h1>
        </div>
        <p className="text-xs text-muted">Review items and apply discounts before payment</p>
      </div>

      {actionNotice && (
        <div className="mt-4 rounded-xl bg-sage/20 border border-sage/40 p-3 text-xs sm:text-sm font-medium text-brand flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 text-success shrink-0" />
          <span>{actionNotice}</span>
        </div>
      )}

      <div className="mt-6 grid gap-8 lg:grid-cols-[1fr_22rem] lg:items-start">
        {/* LEFT: EDIT ITEMS, COUPON SECTION, DELIVERY ADDRESS */}
        <div className="space-y-6">
          {/* 1. DELIVERY ADDRESS PREVIEW */}
          <div className="paper-card p-5 sm:p-6">
            <div className="flex items-center justify-between gap-3 mb-2">
              <h2 className="font-display text-xl text-brand">Delivery address</h2>
              <Link
                href="/checkout/address"
                className="text-xs font-semibold text-accent hover:text-brand underline underline-offset-4"
              >
                Change address
              </Link>
            </div>
            {selectedAddress ? (
              <div className="mt-2 text-sm text-brand leading-relaxed">
                <p className="font-semibold">
                  {selectedAddress.fullName} · +91 {selectedAddress.mobileNumber}
                </p>
                <p className="text-muted">
                  {selectedAddress.houseFlatBuilding}, {selectedAddress.areaStreet}
                  {selectedAddress.landmark ? `, ${selectedAddress.landmark}` : ''}
                </p>
                <p className="text-muted">
                  {selectedAddress.city}, {selectedAddress.state} — {selectedAddress.pinCode}
                </p>
              </div>
            ) : (
              <div className="mt-2 text-sm text-muted">
                <p>
                  No address selected.{' '}
                  <Link
                    href="/checkout/address"
                    className="font-semibold text-accent hover:text-brand underline underline-offset-4"
                  >
                    Choose an address
                  </Link>
                </p>
              </div>
            )}
          </div>

          {/* 2. EDITABLE ORDER ITEMS LIST */}
          <div className="paper-card p-5 sm:p-6">
            <div className="flex items-center justify-between gap-3 border-b border-sand pb-3">
              <h2 className="font-display text-xl text-brand">
                Order Items ({totalItems})
              </h2>
              <span className="text-xs text-muted">You can edit quantities below</span>
            </div>

            <ul className="divide-y divide-sand">
              {items.map((item) => (
                <li key={item.id} className="py-4 flex flex-col sm:flex-row sm:items-center gap-4">
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div className="relative rounded-2xl h-16 w-16 shrink-0 overflow-hidden bg-sand ring-1 ring-sand flex items-center justify-center">
                      <ProductImage
                        src={
                          item.imageUrl ||
                          (typeof item.visual === 'string' && item.visual.startsWith('http')
                            ? item.visual
                            : item.image)
                        }
                        visual={
                          typeof item.visual === 'string' && !item.visual.startsWith('http')
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
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-brand truncate">{item.name}</p>
                      <p className="text-xs text-muted">{formatPrice(item.price)} each</p>
                    </div>
                  </div>

                  {/* Quantity controls & Line Total */}
                  <div className="flex items-center justify-between sm:justify-end gap-5 shrink-0">
                    <div className="flex items-center rounded-full border border-sand bg-surface p-0.5">
                      <button
                        type="button"
                        aria-label={`Decrease quantity of ${item.name}`}
                        onClick={() => updateQuantity(item.id, item.quantity - 1)}
                        className="flex h-7 w-7 items-center justify-center rounded-full text-brand hover:bg-sand/60 transition"
                      >
                        <Minus className="h-3.5 w-3.5" />
                      </button>
                      <span className="w-8 text-center text-xs font-semibold text-brand">
                        {item.quantity}
                      </span>
                      <button
                        type="button"
                        aria-label={`Increase quantity of ${item.name}`}
                        onClick={() => updateQuantity(item.id, item.quantity + 1)}
                        className="flex h-7 w-7 items-center justify-center rounded-full text-brand hover:bg-sand/60 transition"
                      >
                        <Plus className="h-3.5 w-3.5" />
                      </button>
                    </div>

                    <p className="font-semibold text-brand text-sm min-w-16 text-right">
                      {formatPrice(item.price * item.quantity)}
                    </p>

                    <button
                      type="button"
                      aria-label={`Remove ${item.name} from cart`}
                      onClick={() => removeItem(item.id)}
                      className="text-muted hover:text-accent p-1 transition"
                      title="Remove item"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          </div>

          {/* 3. DEDICATED COUPON SECTION */}
          <div className="paper-card p-5 sm:p-6 space-y-4">
            <div className="flex items-center justify-between gap-3 border-b border-sand pb-3">
              <h2 className="font-display text-xl text-brand flex items-center gap-2">
                <Tag className="h-5 w-5 text-accent" /> Apply Coupon
              </h2>
              <Link
                href="/checkout/coupon"
                className="text-xs font-semibold text-brand hover:text-accent underline underline-offset-4 inline-flex items-center gap-1"
              >
                Browse all offers {suggestions.length > 0 ? `(${suggestions.length})` : ''} <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>

            {coupon ? (
              <div className="rounded-2xl border-2 border-emerald-500 bg-success-surface/70 p-4 shadow-sm flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="rounded-full bg-success-surface p-2 text-success shrink-0">
                    <Sparkles className="h-4 w-4" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-sm font-bold tracking-wider text-success">
                        {coupon.code}
                      </span>
                      <span className="rounded-full bg-emerald-200 px-2 py-0.5 text-[10px] font-semibold text-success">
                        APPLIED
                      </span>
                    </div>
                    <p className="text-xs text-success mt-0.5">
                      {coupon.label} · Saving <strong className="font-bold">{formatPrice(discount)}</strong>
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleRemove}
                    className="rounded-lg border border-emerald-300 bg-surface px-3 py-1.5 text-xs font-semibold text-accent hover:bg-blush/20 transition inline-flex items-center gap-1"
                  >
                    <Trash2 className="h-3.5 w-3.5" /> Remove
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <form onSubmit={handleApply} className="flex gap-2">
                  <div className="relative flex-1">
                    <input
                      type="text"
                      value={inputCode}
                      onChange={(e) => setInputCode(e.target.value.toUpperCase())}
                      placeholder="Enter coupon code (e.g. CRAFT10)"
                      aria-label="Coupon code"
                      list="order-summary-coupon-list"
                      className="w-full rounded-xl border border-sand bg-surface px-4 py-2.5 text-sm uppercase placeholder:normal-case font-medium text-brand outline-none focus:border-bloom focus:ring-2 focus:ring-bloom/20"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={couponLoading || !inputCode.trim()}
                    className="rounded-xl bg-plum px-5 py-2.5 text-sm font-semibold text-on-primary shadow-soft hover:bg-overlay-ink disabled:opacity-50 transition"
                  >
                    {couponLoading ? 'Checking...' : 'Apply'}
                  </button>
                </form>

                <datalist id="order-summary-coupon-list">
                  {suggestions.map((s) => (
                    <option key={s.code} value={s.code}>
                      {s.label || s.code}
                    </option>
                  ))}
                </datalist>

                {couponError && (
                  <p className="text-xs text-accent font-medium" role="alert">
                    {couponError}
                  </p>
                )}

                <div className="flex items-center justify-between text-xs text-muted pt-1">
                  <span>Have a gift or promo voucher?</span>
                  <Link
                    href="/checkout/coupon"
                    className="font-semibold text-brand hover:text-accent underline underline-offset-2"
                  >
                    View available coupon offers →
                  </Link>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* RIGHT COLUMN: PRICE BREAKDOWN & CONTINUE TO PAYMENT */}
        <aside className="lg:sticky lg:top-6 space-y-4">
          <div className="paper-card p-6">
            <h2 className="font-display text-2xl text-brand mb-4">Payment Summary</h2>

            <div className="space-y-2.5 text-sm">
              <div className="flex justify-between text-muted">
                <span>Items ({totalItems})</span>
                <span className="font-semibold text-brand">{formatPrice(subtotal)}</span>
              </div>

              {discount > 0 && (
                <div className="flex justify-between text-success font-semibold bg-success-surface px-2.5 py-1.5 rounded-lg">
                  <span className="flex items-center gap-1.5">
                    <Tag className="h-3.5 w-3.5" />
                    Coupon discount ({coupon?.code})
                  </span>
                  <span>-{formatPrice(discount)}</span>
                </div>
              )}

              {gstTotal > 0 && (
                <div className="flex justify-between text-muted">
                  <span>GST</span>
                  <span>+{formatPrice(gstTotal)}</span>
                </div>
              )}

              {otherChargeTotal > 0 && (
                <div className="flex justify-between text-muted">
                  <span>Other product charges</span>
                  <span>+{formatPrice(otherChargeTotal)}</span>
                </div>
              )}

              {codFeeTotal > 0 && (
                <div className="flex justify-between text-muted">
                  <span>COD fees (if selected)</span>
                  <span>+{formatPrice(codFeeTotal)}</span>
                </div>
              )}

              <div className="flex justify-between text-muted">
                <span>Shipping</span>
                <span className="font-semibold text-brand">Calculated at payment</span>
              </div>

              <div className="border-t border-sand pt-3 mt-3 flex justify-between items-baseline">
                <span className="font-medium text-brand">Total Amount</span>
                <span className="font-display text-2xl text-brand">{formatPrice(finalTotal)}</span>
              </div>
            </div>

            {discount > 0 && (
              <p className="mt-3 text-center text-xs font-semibold text-success bg-sage/20 py-2 rounded-xl">
                🎉 Total savings: {formatPrice(discount)}
              </p>
            )}

            <div className="mt-6 space-y-3">
              {selectedAddress && selectedAddress.fullName ? (
                <Link
                  href="/checkout/payment"
                  className="w-full inline-flex justify-center items-center rounded-full bg-plum px-5 py-3 text-sm font-semibold tracking-wide text-on-primary shadow-soft transition hover:bg-overlay-ink hover:-translate-y-0.5 hover:shadow-lift active:translate-y-0"
                >
                  Continue to payment <ArrowRight className="h-4 w-4 ml-1.5" />
                </Link>
              ) : (
                <Link
                  href="/checkout/address"
                  className="w-full inline-flex justify-center items-center rounded-full bg-bloom px-5 py-3 text-sm font-semibold tracking-wide text-on-primary shadow-soft transition hover:bg-overlay-ink hover:-translate-y-0.5 hover:shadow-lift active:translate-y-0"
                >
                  Select delivery address to continue <ArrowRight className="h-4 w-4 ml-1.5" />
                </Link>
              )}
              <Button as={Link} href="/checkout/address" className="w-full" variant="secondary">
                Back to address
              </Button>
            </div>

            <p className="mt-4 text-center text-xs text-muted">
              Handmade pieces — ships within 3–5 days.
            </p>
          </div>
        </aside>
      </div>
    </div>
  )
}

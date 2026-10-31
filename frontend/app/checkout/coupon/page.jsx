'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  ArrowLeft,
  ArrowRight,
  Check,
  CheckCircle2,
  Copy,
  Clock,
  Sparkles,
  Tag,
  Ticket,
  Trash2,
  AlertCircle,
  ShoppingBag,
} from 'lucide-react'
import { formatPrice } from '@/data/products'
import { useCartStore } from '@/lib/cart'
import { useCouponStore, couponDiscountAmount } from '@/lib/coupon'
import CheckoutProgress from '@/components/checkout/CheckoutProgress'

export default function CheckoutCouponPage() {
  const router = useRouter()
  const items = useCartStore((s) => s.items)
  const coupon = useCouponStore((s) => s.coupon)
  const applyCoupon = useCouponStore((s) => s.apply)
  const removeCoupon = useCouponStore((s) => s.remove)
  const storeLoading = useCouponStore((s) => s.loading)
  const storeError = useCouponStore((s) => s.error)

  const [inputCode, setInputCode] = useState('')
  const [availableCoupons, setAvailableCoupons] = useState([])
  const [usedCoupons, setUsedCoupons] = useState([])
  const [exhaustedCoupons, setExhaustedCoupons] = useState([])
  const [loadingCoupons, setLoadingCoupons] = useState(true)
  const [copiedCode, setCopiedCode] = useState('')
  const [actionNotice, setActionNotice] = useState('')

  const subtotal = items.reduce((sum, i) => sum + i.price * i.quantity, 0)
  const totalItems = items.reduce((sum, i) => sum + i.quantity, 0)
  const discount = couponDiscountAmount(coupon, subtotal)
  const finalPayable = Math.max(0, subtotal - discount)

  useEffect(() => {
    async function fetchCoupons() {
      try {
        const res = await fetch('/api/coupons', { cache: 'no-store' })
        const json = await res.json()
        if (json.success) {
          setAvailableCoupons(json.data || [])
          setUsedCoupons(json.used || [])
          setExhaustedCoupons(json.exhausted || [])
        }
      } catch (err) {
        console.error('Failed to load coupons:', err)
      } finally {
        setLoadingCoupons(false)
      }
    }
    fetchCoupons()
    fetch('/api/payment/upi-details').catch(() => {})
  }, [])

  async function handleApply(codeToApply) {
    const code = (codeToApply || inputCode).trim().toUpperCase()
    if (!code) return
    setActionNotice('')
    const ok = await applyCoupon(code, subtotal)
    if (ok) {
      setInputCode('')
      setActionNotice(`Coupon "${code}" applied successfully!`)
      setTimeout(() => setActionNotice(''), 3500)
    }
  }

  function handleRemove() {
    removeCoupon()
    setActionNotice('Coupon removed.')
    setTimeout(() => setActionNotice(''), 3000)
  }

  function handleCopy(code) {
    if (navigator?.clipboard?.writeText) {
      navigator.clipboard.writeText(code)
      setCopiedCode(code)
      setTimeout(() => setCopiedCode(''), 2000)
    }
  }

  return (
    <div className="container-page pb-24 pt-8 max-w-4xl">
      <CheckoutProgress current="coupon" />

      {/* Header & Back navigation */}
      <div className="mt-6 flex flex-wrap items-center justify-between gap-4 border-b border-sand pb-4">
        <div className="flex items-center gap-3">
          <Link
            href="/checkout/address"
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-muted transition hover:text-plum"
          >
            <ArrowLeft className="h-4 w-4" /> Back to address
          </Link>
          <span className="text-sand" aria-hidden="true">/</span>
          <h1 className="font-display text-2xl sm:text-3xl text-plum flex items-center gap-2">
            <Ticket className="h-6 w-6 text-bloom" /> Apply Coupons & Offers
          </h1>
        </div>

        <Link
          href="/checkout"
          className="inline-flex items-center gap-1 text-sm font-semibold text-plum hover:text-bloom underline underline-offset-4"
        >
          Skip to summary <ArrowRight className="h-4 w-4" />
        </Link>
      </div>

      {actionNotice && (
        <div className="mt-4 rounded-xl bg-sage/20 border border-sage/30 px-4 py-3 text-sm font-medium text-plum flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
          <span>{actionNotice}</span>
        </div>
      )}

      <div className="mt-6 grid gap-8 lg:grid-cols-[1fr_20rem] lg:items-start">
        {/* LEFT COLUMN: Input form & Coupon Cards */}
        <div className="space-y-6">
          {/* Coupon Code Input Card */}
          <div className="paper-card p-5 sm:p-6">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-muted">Have a coupon code?</h2>
            <form
              onSubmit={(e) => {
                e.preventDefault()
                handleApply(inputCode)
              }}
              className="mt-3 flex gap-2"
            >
              <div className="relative flex-1">
                <Tag className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted" />
                <input
                  type="text"
                  value={inputCode}
                  onChange={(e) => setInputCode(e.target.value.toUpperCase())}
                  placeholder="Enter coupon code (e.g. CRAFT10)"
                  className="w-full rounded-xl border border-sand bg-white pl-10 pr-4 py-3 text-sm font-medium text-plum uppercase placeholder:normal-case outline-none transition focus:border-bloom focus:ring-2 focus:ring-bloom/20"
                />
              </div>
              <button
                type="submit"
                disabled={storeLoading || !inputCode.trim()}
                className="shrink-0 rounded-xl bg-plum px-6 py-3 text-sm font-semibold text-cream shadow-soft transition hover:bg-ink disabled:opacity-50"
              >
                {storeLoading ? 'Verifying...' : 'Apply'}
              </button>
            </form>
            {storeError && (
              <p className="mt-2.5 text-xs sm:text-sm text-bloom font-medium flex items-center gap-1.5" role="alert">
                <AlertCircle className="h-4 w-4 shrink-0" />
                {storeError}
              </p>
            )}
          </div>

          {/* Currently Applied Coupon Banner */}
          {coupon && (
            <div className="rounded-2xl border-2 border-emerald-500 bg-emerald-50/70 p-5 shadow-soft">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  <div className="rounded-full bg-emerald-100 p-2 text-emerald-700">
                    <Sparkles className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-base font-bold tracking-wider text-emerald-800">
                        {coupon.code}
                      </span>
                      <span className="rounded-full bg-emerald-200 px-2 py-0.5 text-[11px] font-semibold text-emerald-800">
                        APPLIED
                      </span>
                    </div>
                    <p className="mt-1 text-sm font-medium text-emerald-900">
                      {coupon.label}
                    </p>
                    <p className="mt-1 text-xs text-emerald-700">
                      You are saving <strong className="font-semibold">{formatPrice(discount)}</strong> on this order!
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleRemove}
                  className="inline-flex items-center gap-1 rounded-lg border border-emerald-300 bg-white px-3 py-1.5 text-xs font-semibold text-bloom hover:bg-blush/20 transition"
                >
                  <Trash2 className="h-3.5 w-3.5" /> Remove
                </button>
              </div>
            </div>
          )}

          {/* Available Offers Section */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-display text-xl text-plum flex items-center gap-2">
                Available Offers
                {!loadingCoupons && (
                  <span className="text-xs font-sans font-semibold rounded-full bg-sand/60 px-2.5 py-0.5 text-plum">
                    {availableCoupons.length}
                  </span>
                )}
              </h2>
            </div>

            {loadingCoupons ? (
              <div className="space-y-3">
                <div className="h-28 rounded-2xl bg-sand/40 animate-pulse" />
                <div className="h-28 rounded-2xl bg-sand/40 animate-pulse" />
              </div>
            ) : availableCoupons.length === 0 ? (
              <div className="paper-card p-8 text-center text-muted">
                <Ticket className="mx-auto h-10 w-10 text-sand mb-2" />
                <p className="font-medium text-plum">No coupons available right now</p>
                <p className="text-xs mt-1">Check back soon for festive discounts and promotions.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {availableCoupons.map((c) => {
                  const isCurrentlyApplied = coupon?.code === c.code
                  const savings = Math.round(subtotal * (c.discountPercent / 100))
                  const meetsMin = subtotal >= (c.minSubtotal || 0)
                  const diff = (c.minSubtotal || 0) - subtotal

                  return (
                    <div
                      key={c.id || c.code}
                      className={`paper-card p-5 relative overflow-hidden transition border-2 ${
                        isCurrentlyApplied
                          ? 'border-emerald-500 bg-emerald-50/30'
                          : meetsMin
                          ? 'border-sand hover:border-bloom/40'
                          : 'border-sand/60 opacity-80'
                      }`}
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                        {/* Coupon Details */}
                        <div className="space-y-1.5 min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="inline-block rounded-lg border-2 border-dashed border-plum/40 bg-ivory px-3 py-1 font-mono text-sm font-bold tracking-wider text-plum">
                              {c.code}
                            </span>
                            <button
                              type="button"
                              onClick={() => handleCopy(c.code)}
                              className="text-muted hover:text-plum text-xs inline-flex items-center gap-1 py-1"
                              title="Copy coupon code"
                            >
                              <Copy className="h-3.5 w-3.5" />
                              {copiedCode === c.code ? 'Copied!' : 'Copy'}
                            </button>
                            {c.firstTimeOnly && (
                              <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-800">
                                First-time user
                              </span>
                            )}
                          </div>

                          <h3 className="font-display text-lg text-plum pt-1">
                            {c.discountPercent}% OFF · {c.label}
                          </h3>

                          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted">
                            <span>
                              {c.minSubtotal > 0
                                ? `Minimum order: ${formatPrice(c.minSubtotal)}`
                                : 'No minimum cart requirement'}
                            </span>
                            {c.expiresAt && (
                              <span className="inline-flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                Valid till {new Date(c.expiresAt).toLocaleDateString()}
                              </span>
                            )}
                          </div>

                          {/* Qualification Status */}
                          <div className="pt-1">
                            {meetsMin ? (
                              <p className="text-xs font-semibold text-emerald-700 flex items-center gap-1">
                                <Check className="h-3.5 w-3.5" />
                                Eligible! Saves {formatPrice(savings)} on this cart.
                              </p>
                            ) : (
                              <p className="text-xs font-medium text-bloom">
                                Add {formatPrice(diff)} more worth of items to unlock this coupon.
                              </p>
                            )}
                          </div>
                        </div>

                        {/* Action Button */}
                        <div className="shrink-0 sm:self-center">
                          {isCurrentlyApplied ? (
                            <button
                              type="button"
                              onClick={handleRemove}
                              className="w-full sm:w-auto rounded-full bg-emerald-600 px-5 py-2 text-xs font-bold text-white shadow-soft transition hover:bg-emerald-700 inline-flex items-center justify-center gap-1"
                            >
                              <Check className="h-3.5 w-3.5" /> APPLIED
                            </button>
                          ) : (
                            <button
                              type="button"
                              disabled={!meetsMin || storeLoading}
                              onClick={() => handleApply(c.code)}
                              className={`w-full sm:w-auto rounded-full px-5 py-2 text-xs font-bold transition shadow-soft ${
                                meetsMin
                                  ? 'bg-plum text-cream hover:bg-ink cursor-pointer'
                                  : 'bg-sand/60 text-muted cursor-not-allowed opacity-70'
                              }`}
                            >
                              {meetsMin ? 'APPLY COUPON' : 'NOT ELIGIBLE'}
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* Ineligible / Already Used Section */}
          {(usedCoupons.length > 0 || exhaustedCoupons.length > 0) && (
            <div className="mt-8 space-y-3">
              <h3 className="font-display text-lg text-muted flex items-center gap-2">
                <AlertCircle className="h-4 w-4" /> Other offers
              </h3>
              <div className="space-y-3">
                {usedCoupons.map((c) => (
                  <div key={c.id || c.code} className="rounded-xl border border-sand bg-cream/50 p-4 opacity-75">
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-xs font-bold text-muted">{c.code}</span>
                      <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-700">Already used</span>
                    </div>
                    <p className="mt-1 text-xs text-muted">{c.label} · First-time customer offer already redeemed on your account.</p>
                  </div>
                ))}
                {exhaustedCoupons.map((c) => (
                  <div key={c.id || c.code} className="rounded-xl border border-sand bg-cream/50 p-4 opacity-75">
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-xs font-bold text-muted">{c.code}</span>
                      <span className="rounded-full bg-sand px-2 py-0.5 text-[10px] font-semibold text-muted">Limit reached</span>
                    </div>
                    <p className="mt-1 text-xs text-muted">{c.label} · Usage limit reached for this promotion.</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* RIGHT COLUMN: Order Summary Card & Navigation */}
        <aside className="lg:sticky lg:top-6 space-y-4">
          <div className="paper-card p-6">
            <h2 className="font-display text-xl text-plum mb-3 flex items-center gap-2">
              <ShoppingBag className="h-4 w-4 text-bloom" /> Cart Summary
            </h2>

            <div className="space-y-2.5 text-sm">
              <div className="flex justify-between text-muted">
                <span>Total Items</span>
                <span className="font-semibold text-plum">{totalItems}</span>
              </div>
              <div className="flex justify-between text-plum">
                <span>Cart Subtotal</span>
                <span className="font-semibold">{formatPrice(subtotal)}</span>
              </div>

              {discount > 0 && (
                <div className="flex justify-between text-emerald-700 font-semibold bg-emerald-50 p-2 rounded-lg">
                  <span className="flex items-center gap-1.5">
                    <Tag className="h-3.5 w-3.5" />
                    Discount ({coupon?.code})
                  </span>
                  <span>-{formatPrice(discount)}</span>
                </div>
              )}

              <div className="border-t border-sand pt-3 flex justify-between items-baseline">
                <div>
                  <span className="font-medium text-plum">Payable Subtotal</span>
                  <p className="text-[11px] text-muted">Taxes & shipping added at next step</p>
                </div>
                <span className="font-display text-2xl text-plum">
                  {formatPrice(finalPayable)}
                </span>
              </div>
            </div>

            {discount > 0 && (
              <div className="mt-4 rounded-xl bg-sage/20 p-3 text-center text-xs font-semibold text-emerald-800">
                🎉 You are saving {formatPrice(discount)} with {coupon?.code}!
              </div>
            )}

            <div className="mt-6 space-y-2.5">
              <Link
                href="/checkout"
                className="w-full inline-flex justify-center items-center rounded-full bg-plum px-5 py-3 text-sm font-semibold tracking-wide text-cream shadow-soft transition hover:bg-ink"
              >
                Continue to Order Summary <ArrowRight className="h-4 w-4 ml-1.5" />
              </Link>
              <Link
                href="/checkout/address"
                className="w-full inline-flex justify-center items-center rounded-full border border-plum/30 bg-white px-5 py-2.5 text-sm font-semibold text-plum hover:bg-blush/30 transition"
              >
                Back to Address
              </Link>
            </div>
          </div>
        </aside>
      </div>
    </div>
  )
}

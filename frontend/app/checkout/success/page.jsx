'use client'

import { useEffect, useState, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import {
  CheckCircle2,
  Package,
  Truck,
  MapPin,
  Calendar,
  ChevronRight,
  ShoppingBag,
  ArrowLeft,
  Copy,
  AlertCircle,
  MessageCircle,
} from 'lucide-react'
import { formatPrice } from '@/data/products'

// ─── Order status definitions ───────────────────────────────────────────────

const STATUS_META = {
  CONFIRMED:  { label: 'Order confirmed',     icon: CheckCircle2, color: 'text-sage',      dot: 'bg-sage',       desc: 'Your order has been placed.' },
  PROCESSING: { label: 'Being crafted',        icon: Package,      color: 'text-bloom',    dot: 'bg-bloom',      desc: 'Our artisans are preparing it.' },
  SHIPPED:    { label: 'Shipped',              icon: Truck,        color: 'text-plum',     dot: 'bg-plum',       desc: 'On its way to you.' },
  DELIVERED:  { label: 'Delivered',            icon: CheckCircle2, color: 'text-sage',     dot: 'bg-sage',       desc: 'Enjoy your piece!' },
  CANCELLED:  { label: 'Cancelled',            icon: AlertCircle,  color: 'text-bloom',   dot: 'bg-bloom',      desc: 'This order was cancelled.' },
  PENDING:    { label: 'Pending',              icon: AlertCircle,  color: 'text-muted',    dot: 'bg-muted',      desc: 'Awaiting confirmation.' },
}

const PAYMENT_STATUS_META = {
  PAID:                 { label: 'Paid',                color: 'text-sage',    dot: 'bg-sage',    desc: 'Payment received.' },
  COD_PENDING_COLLECTION: { label: 'Pay on Delivery',   color: 'text-bloom',   dot: 'bg-bloom',   desc: 'Payment will be collected at delivery.' },
  AWAITING_VERIFICATION: { label: 'Payment pending verification', color: 'text-bloom', dot: 'bg-bloom', desc: 'We will confirm your order after checking the UPI transfer.' },
  COD_COLLECTED:        { label: 'COD collected',       color: 'text-sage',    dot: 'bg-sage',    desc: 'Cash payment received on delivery.' },
  PENDING:              { label: 'Pending',             color: 'text-muted',   dot: 'bg-muted',   desc: 'Awaiting payment.' },
}

function isCod(order) {
  return order?.paymentMethod === 'Cash on Delivery'
}

const STATUS_FLOW = ['CONFIRMED', 'PROCESSING', 'SHIPPED', 'DELIVERED']

function getFlowIndex(status) {
  if (status === 'CANCELLED' || status === 'PENDING') return -1
  return STATUS_FLOW.indexOf(status)
}

// ─── Timeline component ──────────────────────────────────────────────────────

function StatusTimeline({ status }) {
  const currentIndex = getFlowIndex(status)
  const isCancelled = status === 'CANCELLED'
  const isPending   = status === 'PENDING'

  return (
    <div className="relative" aria-label="Order tracking timeline">
      {/* Connector line */}
      <div className="absolute top-4 left-4 right-4 h-0.5 bg-sand hidden sm:block" aria-hidden="true" />
      {/* Dot + label grid */}
      <div className="flex justify-between relative">
        {STATUS_FLOW.map((s, i) => {
          const meta = STATUS_META[s]
          const Icon = meta.icon
          const done  = currentIndex >= i
          const live  = currentIndex === i && !isCancelled
          return (
            <div key={s} className="flex flex-col items-center gap-2 relative z-10">
              {/* Dot */}
              <div
                className={[
                  'flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 transition-all',
                  done ? `${meta.dot} border-transparent bg-opacity-20` : 'border-sand bg-ivory',
                  live ? 'border-transparent shadow-md scale-110' : '',
                ].join(' ')}
              >
                {done ? (
                  <Icon className={`h-4 w-4 ${meta.color}`} aria-hidden="true" />
                ) : (
                  <span className="h-2 w-2 rounded-full bg-sand" aria-hidden="true" />
                )}
              </div>
              {/* Label */}
              <p className={['text-xs font-medium text-center max-w-[4rem]', done ? meta.color : 'text-muted/60'].join(' ')}>
                {meta.label}
              </p>
            </div>
          )
        })}
      </div>

      {/* Status description */}
      {(isCancelled || isPending) ? (
        <p className="mt-4 text-center text-sm text-muted">{STATUS_META[status]?.desc}</p>
      ) : (
        <p className="mt-4 text-center text-sm text-muted">
          {STATUS_META[status]?.desc || 'In progress…'}
        </p>
      )}
    </div>
  )
}

// ─── Order summary sections ────────────────────────────────────────────────────

function ItemsSummary({ items }) {
  if (!items?.length) return null
  return (
    <div className="space-y-3">
      {items.map((item) => (
        <div key={item.id || item.productId} className="flex items-center gap-3">
          {(item.productImage || item.product?.imageUrl || item.product?.images?.[0]) ? (
            <img
              src={item.productImage || item.product?.imageUrl || item.product?.images?.[0]}
              alt={item.productName || item.product?.name || 'Ordered item'}
              className="h-14 w-14 rounded-xl object-cover bg-ivory"
            />
          ) : (
            <div className="h-14 w-14 rounded-xl bg-sand flex items-center justify-center">
              <Package className="h-5 w-5 text-muted" aria-hidden="true" />
            </div>
          )}
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-plum text-sm leading-tight">{item.productName || item.product?.name || 'Ordered item'}</p>
            <p className="text-xs text-muted">Qty: {item.quantity}</p>
          </div>
          <p className="font-semibold text-plum text-sm shrink-0">
            {formatPrice(item.lineTotal ?? item.unitPrice * item.quantity)}
          </p>
        </div>
      ))}
    </div>
  )
}

function AddressSummary({ address }) {
  if (!address) return null
  if (typeof address === 'string') {
    try { address = JSON.parse(address) } catch { return <p className="text-sm text-muted">Delivery address details are unavailable.</p> }
  }
  return (
    <div className="flex gap-2 text-sm text-plum">
      <MapPin className="h-4 w-4 text-bloom shrink-0 mt-0.5" aria-hidden="true" />
      <div>
        <p className="font-semibold">{address.fullName} · +91 {address.mobileNumber}</p>
        <p className="text-muted text-xs leading-relaxed">
          {[address.houseFlatBuilding, address.areaStreet, address.landmark]
            .filter(Boolean)
            .join(', ')}
          <br />
          {address.city}, {address.state} — {address.pinCode}
        </p>
      </div>
    </div>
  )
}

function PaymentSummary({ totalAmount, paymentMethod, paymentStatus, paymentReference }) {
  const isCod = paymentMethod === 'Cash on Delivery'
  const isAwaiting = paymentStatus === 'AWAITING_VERIFICATION'
  return (
    <div className="space-y-1.5 text-sm">
      {paymentMethod && (
        <div className="flex justify-between gap-3">
          <span className="text-muted">Payment</span>
          <span className="font-semibold text-plum">{paymentMethod}</span>
        </div>
      )}
      <div className="flex justify-between gap-3">
        <span className="text-muted">Status</span>
        <span className={`font-semibold ${paymentStatus === 'PAID' ? 'text-sage' : isAwaiting ? 'text-amber-700' : isCod ? 'text-bloom' : 'text-plum'}`}>
          {isCod ? 'Pay on Delivery' : isAwaiting ? 'Awaiting verification' : paymentStatus || 'Pending'}
        </span>
      </div>
      <div className="flex justify-between gap-3">
        <span className="text-muted">Total</span>
        <span className="font-display text-lg text-plum">{formatPrice(totalAmount)}</span>
      </div>
      {isCod && (
        <div className="rounded-xl bg-sage/10 border border-sage/30 p-2.5 text-xs text-plum">
          <span className="font-semibold">Amount due on delivery:</span> {formatPrice(totalAmount)} — please keep ready in cash.
        </div>
      )}
      {paymentReference && (
        <div className="flex justify-between gap-3">
          <span className="text-muted">Reference (UTR)</span>
          <span className="font-mono text-xs text-plum break-all font-semibold">{paymentReference}</span>
        </div>
      )}
    </div>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────

function SuccessContent() {
  const searchParams = useSearchParams()
  const orderNumber = searchParams.get('order')
  const [order, setOrder]     = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState('')
  const [copied, setCopied]   = useState(false)
  const [upiDetails, setUpiDetails] = useState(null)

  useEffect(() => {
    fetch('/api/payment/upi-details')
      .then((r) => r.json())
      .then((body) => { if (body.success) setUpiDetails(body.data) })
      .catch(() => {})
  }, [])

  useEffect(() => {
    if (!orderNumber) {
      setLoading(false)
      setError('No order number provided.')
      return
    }

    try {
      const cached = window.sessionStorage.getItem(`jamaes:order:${orderNumber}`)
      if (cached) {
        const parsed = JSON.parse(cached)
        if (parsed?.orderNumber === orderNumber) {
          setOrder((curr) => curr || parsed)
        }
      }
    } catch {
      /* ignore */
    }

    fetch(`/api/orders?orderNumber=${encodeURIComponent(orderNumber)}`)
      .then((r) => r.json())
      .then((body) => {
        if (body.success) setOrder(body.data)
        else setError((prev) => (order ? '' : (body.error || 'Order not found.')))
      })
      .catch(() => setError((prev) => (order ? '' : 'Could not load order.')))
      .finally(() => setLoading(false))
  }, [orderNumber])

  async function copyOrderNumber() {
    if (!orderNumber) return
    try {
      await navigator.clipboard.writeText(orderNumber)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      /* ignore */
    }
  }

  if (loading && !order) {
    return (
      <div className="container-page pb-20 pt-10 text-center">
        <div className="mx-auto max-w-md rounded-3xl bg-ivory/60 p-10 animate-pulse">
          <div className="mx-auto h-12 w-12 rounded-full bg-sand" />
          <div className="mt-5 h-6 w-48 bg-sand rounded mx-auto" />
          <div className="mt-2 h-4 w-64 bg-sand rounded mx-auto" />
        </div>
      </div>
    )
  }

  if (error && !order) {
    return (
      <div className="container-page pb-20 pt-10 text-center">
        <div className="mx-auto max-w-md rounded-3xl bg-ivory/60 p-10">
          <AlertCircle className="mx-auto h-12 w-12 text-bloom" aria-hidden="true" />
          <h1 className="mt-4 font-display text-2xl text-plum">Something went wrong</h1>
          <p className="mt-2 text-sm text-muted">{error}</p>
          <Link
            href="/orders/me"
            className="mt-5 inline-flex items-center gap-1 text-sm font-semibold text-bloom hover:text-plum"
          >
            View my orders
          </Link>
        </div>
      </div>
    )
  }

  const isAwaitingUpi = order.paymentStatus === 'AWAITING_VERIFICATION'
  const whatsappNumber = upiDetails?.whatsappNumber || ''
  const proofMessage = `Hi, I have placed order ${order.orderNumber} for ₹${Number(order.totalAmount || 0).toLocaleString('en-IN')} via UPI. My UTR/reference is ${order.paymentReference || 'sharing screenshot'}. Please verify and confirm my order.`
  const whatsappUrl = isAwaitingUpi && whatsappNumber ? `https://wa.me/${whatsappNumber.replace(/\D/g, '')}?text=${encodeURIComponent(proofMessage)}` : ''

  return (
    <div className="container-page pb-24 pt-8 md:pt-12">
      {/* Back nav */}
      <div className="flex items-center gap-3">
        <Link href="/shop" className="inline-flex items-center gap-1 text-sm font-semibold text-muted transition hover:text-plum">
          <ArrowLeft className="h-4 w-4" />
          Back to shop
        </Link>
      </div>

      {/* Hero confirmation */}
      <div className="mt-6 flex flex-col gap-4 rounded-3xl bg-sage/10 border border-sage/30 p-6 md:p-8">
        <div className="flex items-start gap-4">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-sage/20">
            <CheckCircle2 className="h-8 w-8 text-sage" aria-hidden="true" />
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="font-display text-2xl sm:text-3xl text-plum">
              {isCod(order)
                ? 'Order Placed!'
                : isAwaitingUpi
                  ? 'Order Placed — Payment Verification Pending'
                  : 'Order Confirmed!'}
            </h1>
            <p className="mt-1 text-sm sm:text-base text-muted">
              {isCod(order)
                ? 'Thank you! Your handmade order is confirmed — payment is due on delivery.'
                : isAwaitingUpi
                  ? 'Thank you! We received your order and will confirm it once the UPI transfer is verified.'
                  : 'Thank you! Your handmade piece is on its way.'}
            </p>
            {/* Order number */}
            <div className="mt-3 flex items-center gap-2 flex-wrap">
              <span className="text-sm text-muted">Order</span>
              <button
                onClick={copyOrderNumber}
                className="inline-flex items-center gap-1 rounded-full bg-plum px-3 py-1 text-sm font-mono font-semibold text-cream hover:bg-ink transition"
                title="Copy order number"
              >
                {order.orderNumber}
                <Copy className="h-3.5 w-3.5" aria-hidden="true" />
              </button>
              {copied && <span className="text-xs text-sage font-semibold animate-fade-in">Copied!</span>}
              <Link
                href="/orders/me"
                className="ml-auto inline-flex items-center gap-1 rounded-full bg-plum/10 hover:bg-plum/20 px-3.5 py-1 text-xs font-semibold text-plum transition"
              >
                Go to My Orders →
              </Link>
            </div>
          </div>
        </div>

        {/* UPI Verification Info & WhatsApp Proof Action */}
        {isAwaitingUpi && (
          <div className="rounded-2xl bg-amber-50 border border-amber-200/80 p-4 text-sm text-amber-950 mt-1">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <p className="font-semibold">UPI Payment Verification Pending</p>
                <p className="mt-0.5 text-xs text-amber-800">
                  {order.paymentReference ? (
                    <>Saved Reference / UTR: <strong className="font-mono">{order.paymentReference}</strong>. </>
                  ) : null}
                  Send your payment screenshot to help us verify and confirm your order promptly.
                </p>
              </div>
              {whatsappUrl && (
                <a
                  href={whatsappUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex shrink-0 items-center justify-center gap-2 rounded-full bg-[#25D366] px-4 py-2 text-xs font-semibold text-white shadow-soft transition hover:brightness-110"
                >
                  <MessageCircle className="h-4 w-4" aria-hidden="true" />
                  Send Proof on WhatsApp
                </a>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Two-column layout */}
      <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_22rem] lg:items-start">
        {/* LEFT column */}
        <div className="space-y-5">
          {/* Tracking timeline */}
          <div className="paper-card p-6">
            <h2 className="font-display text-xl text-plum mb-5">Tracking</h2>
            <StatusTimeline status={order.status} />
          </div>

          {/* Items */}
          <div className="paper-card p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-display text-xl text-plum">Items</h2>
              <span className="text-xs text-muted">
                {order.items?.length || 0} {order.items?.length === 1 ? 'item' : 'items'}
              </span>
            </div>
            <ItemsSummary items={order.items} />
          </div>

          {/* Delivery address */}
          <div className="paper-card p-6">
            <h2 className="font-display text-xl text-plum mb-3">Delivery address</h2>
            <AddressSummary address={order.shippingAddress} />
          </div>

          {/* Tracking info (if shipped) */}
          {(order.status === 'SHIPPED' || order.status === 'DELIVERED') && (
            <div className="paper-card p-6">
              <h2 className="font-display text-xl text-plum mb-3">Shipping details</h2>
              {order.trackingNumber ? (
                <div className="space-y-1.5 text-sm">
                  <div className="flex justify-between gap-3">
                    <span className="text-muted">Tracking number</span>
                    <span className="font-semibold text-plum font-mono">{order.trackingNumber}</span>
                  </div>
                  {order.shippingPartner && (
                    <div className="flex justify-between gap-3">
                      <span className="text-muted">Partner</span>
                      <span className="font-semibold text-plum">{order.shippingPartner}</span>
                    </div>
                  )}
                  {order.estimatedDelivery && (
                    <div className="flex justify-between gap-3">
                      <span className="text-muted">Est. delivery</span>
                      <span className="font-semibold text-plum">{order.estimatedDelivery}</span>
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-sm text-muted">Tracking details will be shared here once your order ships.</p>
              )}
            </div>
          )}
        </div>

        {/* RIGHT column — sticky summary */}
        <aside>
          <div className="paper-card p-6 lg:sticky lg:top-6 space-y-4">
            <h2 className="font-display text-xl text-plum">Order summary</h2>

            {/* Date */}
            <div className="flex items-center gap-2 text-sm text-muted">
              <Calendar className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              {order.createdAt
                ? new Date(order.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })
                : '—'}
            </div>

            <hr className="border-sand" />

            {/* Totals */}
            <div className="space-y-1.5 text-sm">
              {order.subtotal != null && (
                <div className="flex justify-between gap-3">
                  <span className="text-muted">Subtotal</span>
                  <span className="font-semibold text-plum">{formatPrice(order.subtotal)}</span>
                </div>
              )}
              {order.discount > 0 && (
                <div className="flex justify-between gap-3">
                  <span className="text-muted">Discount</span>
                  <span className="font-semibold text-sage">−{formatPrice(order.discount)}</span>
                </div>
              )}
              {order.fee > 0 && (
                <div className="flex justify-between gap-3">
                  <span className="text-muted">COD fee</span>
                  <span className="font-semibold text-plum">{formatPrice(order.fee)}</span>
                </div>
              )}
              {order.shipping > 0 && (
                <div className="flex justify-between gap-3">
                  <span className="text-muted">Shipping</span>
                  <span className="font-semibold text-plum">{formatPrice(order.shipping)}</span>
                </div>
              )}
              <hr className="border-sand" />
              <div className="flex justify-between gap-3">
                <span className="font-medium text-plum">Total paid</span>
                <span className="font-display text-xl text-plum">{formatPrice(order.totalAmount)}</span>
              </div>
            </div>

            <hr className="border-sand" />
            <PaymentSummary
              totalAmount={order.totalAmount}
              paymentMethod={order.paymentMethod}
              paymentStatus={order.paymentStatus}
              paymentReference={order.paymentReference}
            />

            <hr className="border-sand" />

            {/* Actions */}
            <div className="space-y-2.5">
              <Link href="/orders/me" className="w-full inline-flex items-center justify-center gap-1.5 rounded-full bg-plum px-4 py-2.5 text-sm font-semibold text-cream hover:bg-ink hover:-translate-y-0.5 hover:shadow-lift active:translate-y-0 transition">
                View my orders
                <ChevronRight className="h-4 w-4" aria-hidden="true" />
              </Link>
              <Link href="/shop" className="w-full inline-flex items-center justify-center gap-1.5 rounded-full border border-plum/40 bg-transparent px-4 py-2.5 text-sm font-semibold text-plum hover:bg-plum/5 transition">
                <ShoppingBag className="h-4 w-4" aria-hidden="true" />
                Continue shopping
              </Link>
            </div>

            {/* Help */}
            <p className="text-center text-xs text-muted">
              Questions?{' '}
              <Link href="/contact" className="font-semibold text-bloom hover:text-plum underline underline-offset-2">
                Contact us
              </Link>
            </p>
          </div>
        </aside>
      </div>
    </div>
  )
}

export default function SuccessPage() {
  return (
    <Suspense fallback={
      <div className="container-page pb-20 pt-10 text-center">
        <div className="mx-auto max-w-md rounded-3xl bg-ivory/60 p-10 animate-pulse">
          <div className="mx-auto h-12 w-12 rounded-full bg-sand" />
          <div className="mt-5 h-6 w-48 bg-sand rounded mx-auto" />
        </div>
      </div>
    }>
      <SuccessContent />
    </Suspense>
  )
}

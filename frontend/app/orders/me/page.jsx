'use client'

import { useEffect, useState, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Package, ChevronRight, ShoppingBag, Loader2 } from 'lucide-react'
import { useUserStore } from '@/lib/user'
import { formatPrice } from '@/data/products'
import { STATUS_META, getPaymentStatusMeta } from '@/components/orders/orderConstants'

const STATUS_TABS = [
  { value: 'ALL', label: 'All' },
  { value: 'CONFIRMED', label: 'Confirmed' },
  { value: 'PROCESSING', label: 'Processing' },
  { value: 'SHIPPED', label: 'Shipped' },
  { value: 'DELIVERED', label: 'Delivered' },
  { value: 'CANCELLED', label: 'Cancelled' },
]

function MyOrdersContent() {
  const searchParams = useSearchParams()
  const focusOrder = searchParams.get('order')

  const isLoggedIn = useUserStore((s) => s.isLoggedIn)
  const userEmail = useUserStore((s) => s.email)

  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState('ALL')
  const [error, setError] = useState('')

  // ── Fetch orders when logged in ──
  useEffect(() => {
    if (!isLoggedIn && !userEmail) {
      setLoading(false)
      setOrders([])
      return
    }

    setLoading(true)
    setError('')

    fetch('/api/orders')
      .then((r) => {
        if (r.status === 401) {
          setError('Please log in to view your orders.')
          setOrders([])
          return null
        }
        return r.json()
      })
      .then((body) => {
        if (body === null) return
        if (body.success) setOrders(body.data || [])
        else setError(body.error || 'Could not load orders.')
      })
      .catch(() => setError('Network error. Please try again.'))
      .finally(() => setLoading(false))
  }, [isLoggedIn, userEmail])

  // ── Not logged in (and no user email in store) ──
  if (!isLoggedIn && !userEmail) {
    return (
      <div className="container-page pb-24 pt-8 md:pt-12">
        <div className="flex items-end justify-between flex-wrap gap-3">
          <div>
            <h1 className="font-display text-3xl text-plum">My Orders</h1>
            <p className="mt-1 text-sm text-muted">Track, view and manage your orders.</p>
          </div>
        </div>
        <div className="mt-8 mx-auto max-w-md rounded-3xl bg-ivory/60 p-10 text-center">
          <Package className="mx-auto h-12 w-12 text-bloom" aria-hidden="true" />
          <h2 className="mt-4 font-display text-2xl text-plum">Please log in</h2>
          <p className="mt-2 text-sm text-muted">Log in to view your order history.</p>
          <Link
            href="/account/login"
            className="mt-5 inline-flex items-center gap-1.5 rounded-full bg-plum px-5 py-2.5 text-sm font-semibold text-cream hover:bg-ink transition"
          >
            Log in
          </Link>
        </div>
      </div>
    )
  }

  // ── Loading ──
  if (loading) {
    return (
      <div className="container-page pb-24 pt-8 md:pt-12">
        <div className="flex items-end justify-between flex-wrap gap-3">
          <div>
            <h1 className="font-display text-3xl text-plum">My Orders</h1>
            <p className="mt-1 text-sm text-muted">Track, view and manage your orders.</p>
          </div>
        </div>
        <div className="mt-8 space-y-3" aria-label="Loading orders" aria-busy="true">
          {[1, 2].map((i) => (
            <div key={i} className="paper-card p-5 animate-pulse">
              <div className="h-4 w-32 bg-sand rounded mb-3" aria-hidden="true" />
              <div className="h-3 w-48 bg-sand rounded" aria-hidden="true" />
            </div>
          ))}
        </div>
      </div>
    )
  }

  const filtered = tab === 'ALL' ? orders : orders.filter((o) => o.status === tab)

  return (
    <div className="container-page pb-24 pt-8 md:pt-12">
      {/* Header */}
      <div className="flex items-end justify-between flex-wrap gap-3">
        <div>
          <h1 className="font-display text-3xl text-plum">My Orders</h1>
          <p className="mt-1 text-sm text-muted">Track, view and manage your orders.</p>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="mt-8 mx-auto max-w-md rounded-2xl bg-bloom/10 border border-bloom/30 p-5 text-sm text-plum text-center">
          {error}
          <button
            onClick={() => window.location.reload()}
            className="mt-3 inline-flex items-center gap-1 rounded-full bg-plum px-4 py-2 text-sm font-semibold text-cream hover:bg-ink transition"
          >
            Try Again
          </button>
        </div>
      )}

      {/* Empty state — only when not loading, no error, and zero orders */}
      {!loading && !error && orders.length === 0 && (
        <div className="mt-12 flex flex-col items-center text-center">
          <div className="paper-card rounded-3xl p-10 sm:p-14 max-w-md w-full shadow-soft">
            <div className="mx-auto h-16 w-16 rounded-full bg-blush/50 flex items-center justify-center" aria-hidden="true">
              <Package className="h-8 w-8 text-bloom" />
            </div>
            <h2 className="mt-6 font-display text-2xl text-plum">No orders yet</h2>
            <p className="mt-2 text-sm text-muted leading-relaxed">
              You haven&apos;t placed any orders yet.<br />
              Start exploring our handmade creations.
            </p>
            <Link
              href="/shop"
              className="mt-6 inline-flex items-center gap-2 rounded-full bg-plum px-6 py-2.5 text-sm font-semibold text-cream hover:bg-ink transition shadow-soft"
            >
              <ShoppingBag className="h-4 w-4" aria-hidden="true" />
              Start Shopping
            </Link>
          </div>
        </div>
      )}

      {/* Tabs */}
      {!error && orders.length > 0 && (
        <div className="mt-6 flex flex-wrap gap-2">
          {STATUS_TABS.map((s) => {
            const count = s.value === 'ALL' ? orders.length : orders.filter((o) => o.status === s.value).length
            const active = tab === s.value
            return (
              <button
                key={s.value}
                onClick={() => setTab(s.value)}
                className={[
                  'rounded-full px-4 py-1.5 text-sm font-semibold transition',
                  active ? 'bg-plum text-cream shadow-soft' : 'bg-ivory/60 text-plum hover:bg-ivory',
                ].join(' ')}
                aria-pressed={active}
              >
                {s.label}
                {count > 0 && (
                  <span className={['ml-1.5 rounded-full px-1.5 text-xs', active ? 'bg-cream/20' : 'bg-sand/60'].join(' ')}>
                    {count}
                  </span>
                )}
              </button>
            )
          })}
        </div>
      )}

      {/* Orders list */}
      {!error && !loading && filtered.length > 0 && (
        <ul className="mt-6 space-y-3" aria-label="Orders">
          {filtered.map((o) => {
            const meta = STATUS_META[o.status] || { label: o.status, color: 'text-muted', dot: 'bg-muted' }
            const isFocus = focusOrder && o.orderNumber === focusOrder
            return (
              <li key={o.id}>
                <Link
                  href={`/orders/${o.id}`}
                  className={[
                    'block paper-card p-5 transition hover:-translate-y-0.5 hover:shadow-lift',
                    isFocus ? 'ring-2 ring-bloom/40' : '',
                  ].join(' ')}
                >
                  <div className="flex items-start gap-4">
                    {o.items?.[0]?.productImage ? (
                      <img
                        src={o.items[0].productImage}
                        alt=""
                        className="h-16 w-16 rounded-xl object-cover bg-ivory shrink-0"
                        loading="lazy"
                      />
                    ) : (
                      <div className="h-16 w-16 rounded-xl bg-sand flex items-center justify-center shrink-0" aria-hidden="true">
                        <Package className="h-5 w-5 text-muted" />
                      </div>
                    )}

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-mono text-sm font-semibold text-plum">{o.orderNumber}</p>
                        <span className={['inline-flex items-center gap-1 rounded-full bg-ivory px-2 py-0.5 text-xs font-semibold', meta.color].join(' ')}>
                          <span className={['h-1.5 w-1.5 rounded-full', meta.dot].join(' ')} />
                          {meta.label}
                        </span>
                      </div>
                      <p className="mt-1 text-xs text-muted">
                        {new Date(o.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })} ·{' '}
                        {o.items?.length || 0} {o.items?.length === 1 ? 'item' : 'items'}
                      </p>
                      <p className="mt-2 text-sm font-semibold text-plum">{formatPrice(o.totalAmount)}</p>
                      {o.paymentMethod && (
                        <p className="mt-0.5 text-xs text-muted">{o.paymentMethod}</p>
                      )}
                      {o.paymentStatus && (
                        <p className="text-xs text-muted">{getPaymentStatusMeta(o.paymentStatus).label}</p>
                      )}
                    </div>

                    <ChevronRight className="h-5 w-5 text-muted shrink-0 self-center" aria-hidden="true" />
                  </div>
                </Link>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}

export default function MyOrdersPage() {
  return (
    <Suspense fallback={
      <div className="container-page pb-20 pt-10 text-center">
        <Loader2 className="mx-auto h-12 w-12 text-bloom animate-spin" aria-hidden="true" />
        <p className="mt-3 text-sm text-muted">Loading orders…</p>
      </div>
    }>
      <MyOrdersContent />
    </Suspense>
  )
}

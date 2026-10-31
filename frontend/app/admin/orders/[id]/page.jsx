'use client'

import Link from 'next/link'
import { useParams } from 'next/navigation'
import { useEffect, useState } from 'react'
import { useAdminAccess } from '../../access-context'

const STATUSES = ['PENDING', 'CONFIRMED', 'IN_PROGRESS', 'SHIPPED', 'DELIVERED', 'CANCELLED', 'RETURN_REQUESTED', 'RETURN_APPROVED', 'RETURN_IN_TRANSIT', 'RETURNED']
const label = (value = '') => value.replaceAll('_', ' ').toLowerCase().replace(/\b\w/g, (letter) => letter.toUpperCase())
const money = (amount) => `₹${Number(amount || 0).toLocaleString('en-IN')}`

function paymentBadgeStyle(status) {
  if (status === 'PAID' || status === 'COD_COLLECTED') return 'bg-sage/20 text-emerald-800 border-sage/40'
  if (status === 'AWAITING_VERIFICATION') return 'bg-amber-100 text-amber-800 border-amber-300'
  if (status === 'COD_PENDING_COLLECTION') return 'bg-sky-100 text-sky-800 border-sky-300'
  if (status === 'FAILED' || status === 'CANCELLED') return 'bg-rose-100 text-rose-800 border-rose-300'
  return 'bg-sand/40 text-plum border-sand'
}

export default function AdminOrderDetail() {
  const { can } = useAdminAccess()
  const canManage = can('orders.manage')
  const { id } = useParams()
  const [order, setOrder] = useState(null)
  const [draft, setDraft] = useState({ trackingNumber: '', shippingPartner: '', estimatedDelivery: '' })
  const [paymentRefDraft, setPaymentRefDraft] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  async function load() {
    try {
      const response = await fetch(`/api/admin/orders/${id}`, { cache: 'no-store' })
      const result = await response.json()
      if (!response.ok || !result.success) throw new Error(result.error || 'Could not load order details.')
      setOrder(result.data)
      setDraft({
        trackingNumber: result.data.trackingNumber || '',
        shippingPartner: result.data.shippingPartner || '',
        estimatedDelivery: result.data.estimatedDelivery || '',
      })
      setPaymentRefDraft(result.data.paymentReference || '')
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (id) load()
  }, [id])

  async function patchOrder(values) {
    setError('')
    setNotice('')
    setSaving(true)
    try {
      const response = await fetch('/api/admin/orders', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, ...values }),
      })
      const result = await response.json()
      if (!response.ok || !result.success) throw new Error(result.error || 'Could not update order.')
      setNotice('Order updated.')
      await load()
    } catch (e) {
      setError(e.message)
    } finally {
      setSaving(false)
    }
  }

  async function updateRefund(refund, refundStatus) {
    setError('')
    setNotice('')
    setSaving(true)
    try {
      const response = await fetch('/api/admin/orders', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refundRequestId: refund.id, refundStatus }),
      })
      const result = await response.json()
      if (!response.ok || !result.success) throw new Error(result.error || 'Could not update refund request.')
      setNotice('Refund request updated.')
      await load()
    } catch (e) {
      setError(e.message)
    } finally {
      setSaving(false)
    }
  }

  let address = order?.shippingAddress
  if (typeof address === 'string') {
    try {
      address = JSON.parse(address)
    } catch {
      address = { address }
    }
  }
  const addressParts = address && typeof address === 'object' ? {
    name: address.fullName || address.name,
    phone: address.mobileNumber || address.phone,
    house: address.houseFlatBuilding || address.addressLine1 || address.street,
    area: address.areaStreet || address.addressLine2 || address.area,
    landmark: address.landmark,
    city: address.city,
    state: address.state,
    pin: address.pinCode || address.postalCode || address.zip,
    country: address.country,
  } : {}

  if (loading) return <p role="status">Loading order details…</p>
  if (!order) {
    return (
      <section className="space-y-4">
        <p role="alert" className="rounded-xl bg-bloom/10 p-3 text-bloom">{error || 'Order not found.'}</p>
        <Link href="/admin/orders" className="text-plum underline">Back to orders</Link>
      </section>
    )
  }

  const isUpi = order.paymentMethod === 'UPI' || order.paymentMethod?.toLowerCase().includes('upi')

  return (
    <section className="min-w-0 space-y-5 sm:space-y-6">
      <Link href="/admin/orders" className="inline-flex min-h-10 items-center text-sm text-plum underline underline-offset-4">
        ← Back to orders
      </Link>

      <header className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <p className="text-sm text-muted">Order details</p>
          <h1 className="break-all font-display text-2xl text-plum sm:text-3xl">{order.orderNumber}</h1>
          <p className="mt-1 text-sm text-muted">Placed {new Date(order.createdAt).toLocaleString()}</p>
        </div>
        {canManage ? (
          <label className="text-sm font-medium text-plum">
            Fulfillment status
            <select
              aria-label="Fulfillment status"
              value={order.status}
              disabled={saving}
              onChange={(event) => {
                const nextStatus = event.target.value
                if (nextStatus === 'CONFIRMED' && isUpi && order.paymentStatus !== 'PAID') {
                  setError('Cannot confirm a UPI order before payment is verified and marked as Paid.')
                  return
                }
                patchOrder({ status: nextStatus })
              }}
              className="mt-1 min-h-11 w-full rounded-xl border border-sand bg-white px-3 sm:w-auto"
            >
              {STATUSES.map((value) => (
                <option
                  key={value}
                  value={value}
                  disabled={value === 'CONFIRMED' && isUpi && order.paymentStatus !== 'PAID'}
                >
                  {label(value)}
                  {value === 'CONFIRMED' && isUpi && order.paymentStatus !== 'PAID' ? ' (Requires Paid)' : ''}
                </option>
              ))}
            </select>
          </label>
        ) : (
          <span className="rounded-full bg-blush/40 px-3 py-2 text-sm text-plum">{label(order.status)}</span>
        )}
      </header>

      {error && <p role="alert" className="rounded-xl bg-bloom/10 p-3 text-sm text-bloom">{error}</p>}
      {notice && <p role="status" className="rounded-xl bg-sage/20 p-3 text-sm">{notice}</p>}

      <div className="grid min-w-0 gap-4 xl:grid-cols-[minmax(0,1.5fr)_minmax(280px,1fr)]">
        <div className="min-w-0 space-y-4">
          {/* Items */}
          <section className="rounded-2xl bg-cream p-4 shadow-soft ring-1 ring-sand sm:p-5">
            <h2 className="font-display text-xl text-plum">Items</h2>
            <div className="mt-3 divide-y divide-sand">
              {order.items.map((item) => (
                <div key={item.id} className="flex min-w-0 flex-col justify-between gap-2 py-3 sm:flex-row sm:items-center">
                  <div className="min-w-0">
                    <p className="break-words font-medium text-plum">{item.product.name}</p>
                    <p className="text-sm text-muted">
                      Qty {item.quantity} · {money(item.unitPrice)} each{item.customization ? ` · ${item.customization}` : ''}
                    </p>
                    <p className="text-xs text-muted">
                      GST {item.gstPercent}% ({money(item.gstAmount)}) · COD fee {money(item.codFee)} · Other charge {money(item.otherCharge)}
                    </p>
                  </div>
                  <strong className="shrink-0">
                    {money(item.unitPrice * item.quantity + item.gstAmount + item.codFee + item.otherCharge)}
                  </strong>
                </div>
              ))}
            </div>
          </section>

          {/* Customer and delivery */}
          <section className="rounded-2xl bg-cream p-4 shadow-soft ring-1 ring-sand sm:p-5">
            <h2 className="font-display text-xl text-plum">Customer and delivery</h2>
            <dl className="mt-3 grid gap-4 text-sm sm:grid-cols-2">
              <div>
                <dt className="text-muted">Customer</dt>
                <dd className="break-words font-medium">{order.customerName}</dd>
              </div>
              <div>
                <dt className="text-muted">Email</dt>
                <dd className="break-all font-medium">{order.customerEmail}</dd>
              </div>
              <div>
                <dt className="text-muted">Phone</dt>
                <dd className="break-words font-medium">{order.customerPhone || order.user?.phone || 'Not provided'}</dd>
              </div>
              <div>
                <dt className="text-muted">Account type</dt>
                <dd className="font-medium">{order.user ? 'Registered customer' : 'Guest order'}</dd>
              </div>
            </dl>
            <div className="mt-4 border-t border-sand pt-3 text-sm">
              <p className="font-medium text-plum">Shipping address</p>
              {addressParts.house || addressParts.area || addressParts.city ? (
                <div className="mt-2 space-y-1 break-words text-muted">
                  <p className="font-medium text-ink">
                    {addressParts.name || order.customerName}{addressParts.phone ? ` · ${addressParts.phone}` : ''}
                  </p>
                  {addressParts.house && <p>{addressParts.house}</p>}
                  {addressParts.area && <p>{addressParts.area}</p>}
                  {addressParts.landmark && <p>Near {addressParts.landmark}</p>}
                  <p>{[addressParts.city, addressParts.state].filter(Boolean).join(', ')}{addressParts.pin ? ` — ${addressParts.pin}` : ''}</p>
                  {addressParts.country && <p>{addressParts.country}</p>}
                </div>
              ) : (
                <p className="mt-1 text-muted">No shipping address saved.</p>
              )}
            </div>
          </section>

          {/* Shipping and tracking */}
          <section className="rounded-2xl bg-cream p-4 shadow-soft ring-1 ring-sand sm:p-5">
            <h2 className="font-display text-xl text-plum">Shipping and tracking</h2>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <label className="text-sm text-muted">
                Shipping partner
                <input
                  readOnly={!canManage}
                  value={draft.shippingPartner}
                  onChange={(event) => setDraft({ ...draft, shippingPartner: event.target.value })}
                  className="mt-1 min-h-11 w-full rounded-xl border border-sand bg-white px-3 text-plum read-only:bg-ink/5"
                />
              </label>
              <label className="text-sm text-muted">
                Tracking number
                <input
                  readOnly={!canManage}
                  value={draft.trackingNumber}
                  onChange={(event) => setDraft({ ...draft, trackingNumber: event.target.value })}
                  className="mt-1 min-h-11 w-full rounded-xl border border-sand bg-white px-3 text-plum read-only:bg-ink/5"
                />
              </label>
              <label className="text-sm text-muted sm:col-span-2">
                Estimated delivery
                <input
                  readOnly={!canManage}
                  value={draft.estimatedDelivery}
                  onChange={(event) => setDraft({ ...draft, estimatedDelivery: event.target.value })}
                  placeholder="e.g. 3–5 business days"
                  className="mt-1 min-h-11 w-full rounded-xl border border-sand bg-white px-3 text-plum read-only:bg-ink/5"
                />
              </label>
            </div>
            {canManage && (
              <button
                type="button"
                disabled={saving}
                onClick={() => patchOrder(draft)}
                className="mt-4 min-h-11 w-full rounded-xl bg-plum px-4 py-2 font-medium text-cream disabled:opacity-60 sm:w-auto"
              >
                {saving ? 'Saving…' : 'Save tracking details'}
              </button>
            )}
          </section>

          {/* Refund requests */}
          <section className="rounded-2xl bg-cream p-4 shadow-soft ring-1 ring-sand sm:p-5">
            <h2 className="font-display text-xl text-plum">Refund requests</h2>
            {!order.refundRequests?.length ? (
              <p className="mt-2 text-sm text-muted">No refund requests for this order.</p>
            ) : (
              <div className="mt-3 space-y-3">
                {order.refundRequests.map((refund) => (
                  <div key={refund.id} className="rounded-xl border border-sand bg-white p-3 sm:p-4">
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                      <strong className="text-plum">{label(refund.status)} · {money(refund.amount)}</strong>
                      {canManage && !['COMPLETED', 'REJECTED'].includes(refund.status) && (
                        <select
                          aria-label={`Refund status ${refund.id}`}
                          disabled={saving}
                          value={refund.status}
                          onChange={(event) => updateRefund(refund, event.target.value)}
                          className="min-h-11 w-full rounded-lg border border-sand px-3 sm:w-auto"
                        >
                          <option value={refund.status} disabled>{label(refund.status)}</option>
                          {({ REQUESTED: ['APPROVED', 'REJECTED'], APPROVED: ['PROCESSING', 'REJECTED'], PROCESSING: ['COMPLETED'] }[refund.status] || []).map((value) => (
                            <option key={value} value={value}>{label(value)}</option>
                          ))}
                        </select>
                      )}
                    </div>
                    <p className="mt-2 break-words text-sm text-muted">Refund UPI: {refund.refundUpiId || 'Not provided'}</p>
                    <p className="mt-1 break-words text-sm text-muted">{refund.reason}</p>
                    <p className="mt-1 text-xs text-muted">Requested {new Date(refund.createdAt).toLocaleString()}</p>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>

        <aside className="min-w-0 space-y-4">
          {/* Price details */}
          <section className="rounded-2xl bg-cream p-4 shadow-soft ring-1 ring-sand sm:p-5">
            <h2 className="font-display text-xl text-plum">Price details</h2>
            <dl className="mt-3 space-y-2 text-sm">
              <div className="flex justify-between gap-3">
                <dt className="text-muted">Subtotal</dt>
                <dd>{money(order.subtotal)}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-muted">Discount</dt>
                <dd>−{money(order.discount)}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-muted">Shipping</dt>
                <dd>{money(order.shipping)}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-muted">Fees and charges</dt>
                <dd>{money(order.fee)}</dd>
              </div>
              <div className="flex justify-between gap-3 border-t border-sand pt-3 font-semibold text-plum">
                <dt>Total</dt>
                <dd>{money(order.totalAmount)}</dd>
              </div>
            </dl>
          </section>

          {/* ── Payment Details & Management ── */}
          <section className="rounded-2xl bg-cream p-4 shadow-soft ring-1 ring-sand sm:p-5">
            <div className="flex items-center justify-between gap-2">
              <h2 className="font-display text-xl text-plum">Payment</h2>
              <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold ${paymentBadgeStyle(order.paymentStatus)}`}>
                {label(order.paymentStatus)}
              </span>
            </div>

            <dl className="mt-3 space-y-3 break-words text-sm">
              <div>
                <dt className="text-xs text-muted">Method</dt>
                <dd className="font-medium text-plum">{order.paymentMethod || 'Not recorded'}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted">Payment status</dt>
                <dd className="font-medium text-plum">{label(order.paymentStatus)}</dd>
              </div>
              {!canManage && (
                <div>
                  <dt className="text-xs text-muted">Payment reference</dt>
                  <dd className="font-medium text-plum break-all">{order.paymentReference || 'Not recorded'}</dd>
                </div>
              )}
              <div>
                <dt className="text-xs text-muted">Order notes</dt>
                <dd className="whitespace-pre-wrap text-xs text-muted">{order.notes || 'None'}</dd>
              </div>
            </dl>

            {canManage && (
              <div className="mt-4 border-t border-sand pt-4 space-y-3">
                {/* UTR / Reference Input */}
                <div>
                  <label className="block text-xs font-semibold text-plum mb-1">
                    Payment Reference (UTR)
                    {isUpi && !paymentRefDraft.trim() && (
                      <span className="text-bloom ml-1 font-normal">*Required for UPI verification</span>
                    )}
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={paymentRefDraft}
                      onChange={(e) => setPaymentRefDraft(e.target.value)}
                      placeholder="Enter UPI UTR or reference"
                      maxLength={80}
                      className="min-h-10 flex-1 rounded-xl border border-sand bg-white px-3 text-sm text-plum"
                    />
                    {paymentRefDraft.trim() !== (order.paymentReference || '') && (
                      <button
                        type="button"
                        disabled={saving}
                        onClick={() => patchOrder({ paymentReference: paymentRefDraft.trim() })}
                        className="rounded-xl bg-plum px-3 text-xs font-semibold text-cream hover:bg-ink transition"
                      >
                        Save UTR
                      </button>
                    )}
                  </div>
                </div>

                {/* UPI Verification Quick Action */}
                {isUpi && order.paymentStatus !== 'PAID' && (
                  <div className="rounded-xl border border-sage/40 bg-sage/10 p-3">
                    <p className="text-xs text-emerald-900 font-medium">Verify UPI Payment</p>
                    <p className="text-xs text-muted mt-0.5">
                      Confirm receipt of transfer from customer. Order will be marked Confirmed automatically.
                    </p>
                    <button
                      type="button"
                      disabled={saving}
                      onClick={() => {
                        if (!paymentRefDraft.trim() && !order.paymentReference?.trim()) {
                          setError('Enter the UPI transaction reference (UTR) before confirming payment.')
                          return
                        }
                        patchOrder({
                          paymentStatus: 'PAID',
                          paymentReference: paymentRefDraft.trim() || order.paymentReference || null,
                          status: order.status === 'PENDING' ? 'CONFIRMED' : undefined,
                        })
                      }}
                      className="mt-2.5 w-full rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-semibold text-sm py-2 px-3 transition shadow-sm"
                    >
                      {saving ? 'Verifying…' : '✓ Verify & Mark as Paid'}
                    </button>
                  </div>
                )}

                {/* COD Quick Action */}
                {order.paymentMethod === 'Cash on Delivery' && order.paymentStatus === 'COD_PENDING_COLLECTION' && (
                  <button
                    type="button"
                    disabled={saving}
                    onClick={() => patchOrder({ paymentStatus: 'COD_COLLECTED' })}
                    className="w-full rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-semibold text-sm py-2 px-3 transition shadow-sm"
                  >
                    ✓ Mark Cash Collected
                  </button>
                )}

                {/* Manual Payment Status Dropdown */}
                <div>
                  <label className="block text-xs font-medium text-muted mb-1">Update payment status</label>
                  <select
                    aria-label="Payment status"
                    value={order.paymentStatus}
                    disabled={saving}
                    onChange={(e) => {
                      const nextPaymentStatus = e.target.value
                      if (nextPaymentStatus === 'PAID' && isUpi && !paymentRefDraft.trim() && !order.paymentReference?.trim()) {
                        setError('Enter the UPI transaction reference (UTR) before marking payment as Paid.')
                        return
                      }
                      patchOrder({
                        paymentStatus: nextPaymentStatus,
                        paymentReference: paymentRefDraft.trim() || order.paymentReference || null,
                        status: nextPaymentStatus === 'PAID' && order.status === 'PENDING' ? 'CONFIRMED' : undefined,
                      })
                    }}
                    className="min-h-11 w-full rounded-xl border border-sand bg-white px-3 text-sm text-plum"
                  >
                    {[
                      'AWAITING_VERIFICATION',
                      'PAID',
                      'MANUAL_REVIEW',
                      'COD_PENDING_COLLECTION',
                      'COD_COLLECTED',
                      'FAILED',
                      'CANCELLED',
                    ].map((st) => (
                      <option key={st} value={st}>
                        {label(st)}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            )}
          </section>

          {/* ── Payment Activity Section ── */}
          <section className="rounded-2xl bg-cream p-4 shadow-soft ring-1 ring-sand sm:p-5">
            <h2 className="font-display text-xl text-plum">Payment activity</h2>
            {order.paymentLogs?.length ? (
              <ul className="mt-3 space-y-3">
                {order.paymentLogs.map((log) => (
                  <li key={log.id} className="border-l-2 border-bloom pl-3 text-sm">
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-semibold text-plum">{label(log.status)}</p>
                      <span className="text-xs font-medium text-plum">{money(log.amount)}</span>
                    </div>
                    <p className="break-words text-xs text-muted mt-0.5">
                      {log.method || log.provider || 'Payment'} · {new Date(log.createdAt).toLocaleString()}
                    </p>
                    {(log.utr || log.providerReference) && (
                      <p className="break-all text-xs font-mono text-plum mt-1 bg-white/70 rounded px-1.5 py-0.5 inline-block">
                        Ref: {log.utr || log.providerReference}
                      </p>
                    )}
                    {log.verifiedBy && (
                      <p className="text-xs text-emerald-700 font-medium mt-1">
                        ✓ Verified by {log.verifiedBy}{log.verifiedAt ? ` on ${new Date(log.verifiedAt).toLocaleString()}` : ''}
                      </p>
                    )}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-2 text-sm text-muted">No payment activity recorded.</p>
            )}
          </section>
        </aside>
      </div>
    </section>
  )
}

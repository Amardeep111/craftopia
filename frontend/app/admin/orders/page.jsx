'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { useAdminAccess } from '../access-context'

const STATUSES = ['PENDING', 'CONFIRMED', 'IN_PROGRESS', 'SHIPPED', 'DELIVERED', 'CANCELLED', 'RETURN_REQUESTED', 'RETURN_APPROVED', 'RETURN_IN_TRANSIT', 'RETURNED']
const label = (value = '') => value.replaceAll('_', ' ').toLowerCase().replace(/\b\w/g, (letter) => letter.toUpperCase())

export default function AdminOrders() {
  const { can } = useAdminAccess()
  const canManage = can('orders.manage')
  const [orders, setOrders] = useState([])
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState('')
  const [customer, setCustomer] = useState('')
  const [status, setStatus] = useState('')
  const [payment, setPayment] = useState('')

  async function load() {
    setLoading(true)
    try {
      const response = await fetch('/api/admin/orders', { cache: 'no-store' })
      const result = await response.json()
      if (!response.ok || !result.success) throw new Error(result.error || 'Could not load orders.')
      setOrders(result.data)
      setError('')
    } catch (e) { setError(e.message) } finally { setLoading(false) }
  }
  useEffect(() => { load() }, [])

  async function updateStatus(order, nextStatus) {
    setError('')
    const isUpi = order.paymentMethod === 'UPI' || order.paymentMethod?.toLowerCase().includes('upi')
    if (nextStatus === 'CONFIRMED' && isUpi && order.paymentStatus !== 'PAID') {
      setError(`Cannot confirm UPI order ${order.orderNumber} before payment is verified. Click "Verify Payment" to confirm it.`)
      return
    }
    try {
      const response = await fetch('/api/admin/orders', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: order.id, status: nextStatus }) })
      const result = await response.json()
      if (!response.ok || !result.success) throw new Error(result.error || 'Could not update order.')
      await load()
    } catch (e) { setError(e.message) }
  }

  async function updateRefundStatus(refundRequest, refundStatus) {
    setError('')
    try {
      const response = await fetch('/api/admin/orders', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ refundRequestId: refundRequest.id, refundStatus }) })
      const result = await response.json()
      if (!response.ok || !result.success) throw new Error(result.error || 'Could not update refund request.')
      await load()
    } catch (e) { setError(e.message) }
  }

  const customers = useMemo(() => [...new Map(orders.map((order) => [order.customerEmail, order])).values()].sort((a, b) => a.customerName.localeCompare(b.customerName)), [orders])
  const paymentStatuses = useMemo(() => [...new Set(orders.map((order) => order.paymentStatus))].sort(), [orders])
  const filteredOrders = useMemo(() => orders.filter((order) => {
    const term = query.trim().toLowerCase()
    const matchesQuery = !term || [order.orderNumber, order.customerName, order.customerEmail, order.customerPhone].some((value) => value?.toLowerCase().includes(term))
    return matchesQuery && (!customer || order.customerEmail === customer) && (!status || order.status === status) && (!payment || order.paymentStatus === payment)
  }), [orders, query, customer, status, payment])
  const clearFilters = () => { setQuery(''); setCustomer(''); setStatus(''); setPayment('') }

  return <section className="min-w-0 space-y-5 sm:space-y-6">
    <header><h1 className="font-display text-2xl text-plum sm:text-3xl">Orders</h1><p className="mt-1 text-sm text-muted">Find orders by customer, then open one for full payment and fulfillment details.</p></header>
    {error && <p role="alert" className="rounded-xl bg-bloom/10 p-3 text-sm text-bloom">{error}</p>}
    <div className="grid gap-3 rounded-2xl bg-cream p-4 shadow-soft ring-1 ring-sand sm:grid-cols-2 xl:grid-cols-4">
      <label className="text-xs font-medium text-muted">Search<input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Order, name, email, phone" className="mt-1 min-h-11 w-full rounded-xl border border-sand bg-white px-3 text-sm text-plum" /></label>
      <label className="text-xs font-medium text-muted">Customer<select value={customer} onChange={(event) => setCustomer(event.target.value)} className="mt-1 min-h-11 w-full rounded-xl border border-sand bg-white px-3 text-sm text-plum"><option value="">All customers</option>{customers.map((entry) => <option key={entry.customerEmail} value={entry.customerEmail}>{entry.customerName} · {entry.customerEmail}</option>)}</select></label>
      <label className="text-xs font-medium text-muted">Order status<select value={status} onChange={(event) => setStatus(event.target.value)} className="mt-1 min-h-11 w-full rounded-xl border border-sand bg-white px-3 text-sm text-plum"><option value="">All statuses</option>{STATUSES.map((value) => <option key={value} value={value}>{label(value)}</option>)}</select></label>
      <label className="text-xs font-medium text-muted">Payment status<select value={payment} onChange={(event) => setPayment(event.target.value)} className="mt-1 min-h-11 w-full rounded-xl border border-sand bg-white px-3 text-sm text-plum"><option value="">All payment statuses</option>{paymentStatuses.map((value) => <option key={value} value={value}>{label(value)}</option>)}</select></label>
      <div className="flex items-center justify-between text-sm text-muted sm:col-span-2 xl:col-span-4"><span>{loading ? 'Loading orders…' : `${filteredOrders.length} of ${orders.length} orders`}</span><button type="button" onClick={clearFilters} className="min-h-10 rounded-lg px-3 text-plum underline underline-offset-2">Clear filters</button></div>
    </div>
    {loading ? <p role="status">Loading orders…</p> : filteredOrders.length === 0 ? <div className="rounded-2xl bg-cream p-8 text-center text-muted">{orders.length ? 'No orders match these filters.' : 'No orders yet.'}</div> :
      <div className="space-y-4">{filteredOrders.map((order) => <article key={order.id} className="min-w-0 rounded-2xl bg-cream p-4 shadow-soft ring-1 ring-sand sm:p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0"><Link href={`/admin/orders/${order.id}`} className="break-all font-semibold text-plum underline decoration-sand underline-offset-4 hover:decoration-plum">{order.orderNumber}</Link><p className="mt-1 break-words text-sm">{order.customerName} · {order.customerEmail}</p><p className="text-xs text-muted">{new Date(order.createdAt).toLocaleString()}</p></div>
          {canManage ? <label className="text-sm">Fulfillment status<select aria-label={`Status for ${order.orderNumber}`} value={order.status} onChange={(event) => updateStatus(order, event.target.value)} className="mt-1 min-h-11 w-full rounded-lg border border-sand bg-white px-3 sm:ml-2 sm:mt-0 sm:w-auto">{STATUSES.map((value) => {
            const isUpi = order.paymentMethod === 'UPI' || order.paymentMethod?.toLowerCase().includes('upi')
            const disabled = value === 'CONFIRMED' && isUpi && order.paymentStatus !== 'PAID'
            return <option key={value} value={value} disabled={disabled}>{label(value)}{disabled ? ' (Requires Paid)' : ''}</option>
          })}</select></label> : <span className="rounded-full bg-blush/40 px-3 py-2 text-sm text-plum">{label(order.status)}</span>}
        </div>
        <div className="mt-4 flex flex-col justify-between gap-2 border-t border-sand pt-3 text-sm sm:flex-row"><span className="break-words">{order.items.map((item) => `${item.product.name} × ${item.quantity}`).join(', ')}</span><strong className="shrink-0 text-plum">₹{order.totalAmount}</strong></div>
        <div className="mt-2 flex flex-wrap items-center justify-between gap-2 pt-1 text-xs">
          <p className="break-words text-muted">Payment: <span className="font-medium text-plum">{order.paymentMethod || 'Not set'}</span> · <span className={`font-semibold ${order.paymentStatus === 'PAID' ? 'text-emerald-700' : order.paymentStatus === 'AWAITING_VERIFICATION' ? 'text-amber-700' : 'text-plum'}`}>{label(order.paymentStatus)}</span>{order.paymentReference ? ` · Ref: ${order.paymentReference}` : ''}</p>
          {canManage && (order.paymentMethod === 'UPI' || order.paymentMethod?.toLowerCase().includes('upi')) && order.paymentStatus !== 'PAID' && (
            <Link href={`/admin/orders/${order.id}`} className="rounded-full bg-amber-100 hover:bg-amber-200 border border-amber-300 px-2.5 py-0.5 text-xs font-semibold text-amber-900 transition">Verify Payment →</Link>
          )}
        </div>
        {order.refundRequests?.map((refund) => <div key={refund.id} className="mt-4 rounded-2xl border border-sand bg-white p-3 text-sm sm:p-4">
          <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-center"><strong className="text-plum">Refund request · {label(refund.status)}</strong>
            {canManage && !['COMPLETED', 'REJECTED'].includes(refund.status) && <select aria-label={`Refund status for ${order.orderNumber}`} value={refund.status} onChange={(event) => updateRefundStatus(refund, event.target.value)} className="min-h-11 w-full rounded-lg border border-sand px-3 sm:w-auto">
              <option value={refund.status} disabled>{label(refund.status)}</option>
              {({ REQUESTED: ['APPROVED', 'REJECTED'], APPROVED: ['PROCESSING', 'REJECTED'], PROCESSING: ['COMPLETED'] }[refund.status] || []).map((value) => <option key={value} value={value}>{label(value)}</option>)}
            </select>}
          </div>
          <p className="mt-2 break-words text-muted">₹{refund.amount} · Refund UPI ID: <span className="font-medium text-plum">{refund.refundUpiId}</span></p><p className="mt-1 break-words text-muted">{refund.reason}</p>
        </div>)}
      </article>)}</div>}
  </section>
}

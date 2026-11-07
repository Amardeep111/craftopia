'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { useAdminAccess } from '../access-context'
import AdminPagination from '../components/AdminPagination'

const STATUSES = ['PENDING', 'CONFIRMED', 'IN_PROGRESS', 'SHIPPED', 'DELIVERED', 'CANCELLED', 'RETURN_REQUESTED', 'RETURN_APPROVED', 'RETURN_IN_TRANSIT', 'RETURNED']
const label = (value = '') => value === 'IN_PROGRESS' ? 'Being crafted' : value.replaceAll('_', ' ').toLowerCase().replace(/\b\w/g, (letter) => letter.toUpperCase())

export default function AdminOrders() {
  const { can } = useAdminAccess()
  const canManage = can('orders.manage')
  const [orders, setOrders] = useState([])
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(25)
  const [total, setTotal] = useState(0)
  const [pages, setPages] = useState(0)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState('')
  const [customer, setCustomer] = useState('')
  const [status, setStatus] = useState('')
  const [payment, setPayment] = useState('')

  async function load() {
    setLoading(true)
    try {
      const params = new URLSearchParams({ page: String(page), pageSize: String(pageSize) })
      if (query.trim()) params.set('search', query.trim())
      if (customer.trim()) params.set('customer', customer.trim())
      if (status) params.set('status', status)
      if (payment) params.set('paymentStatus', payment)
      const response = await fetch(`/api/admin/orders?${params}`, { cache: 'no-store' })
      const result = await response.json()
      if (!response.ok || !result.success) throw new Error(result.error || 'Could not load orders.')
      setOrders(Array.isArray(result.data?.items) ? result.data.items : [])
      setTotal(result.data?.total || 0)
      setPages(result.data?.pages || 0)
      setError('')
    } catch (e) { setError(e.message) } finally { setLoading(false) }
  }
  useEffect(() => {
    const timer = window.setTimeout(load, 250)
    return () => window.clearTimeout(timer)
  }, [page, pageSize, query, customer, status, payment])

  async function updateStatus(order, nextStatus) {
    setError('')
    const isUpi = order.paymentMethod === 'UPI' || order.paymentMethod?.toLowerCase().includes('upi')
    if (nextStatus === 'CONFIRMED' && isUpi && order.paymentStatus !== 'PAID') {
      setError(`Cannot confirm UPI order ${order.orderNumber} before payment is verified. Click "Verify Payment" to confirm it.`)
      return
    }
    if ((order.status === 'SHIPPED' || order.status === 'DELIVERED') && nextStatus === 'IN_PROGRESS') {
      setError(`Once order ${order.orderNumber} is marked as Shipped, it cannot be changed back to In Progress.`)
      return
    }
    try {
      const response = await fetch('/api/admin/orders', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: order.id, status: nextStatus }) })
      const result = await response.json()
      if (!response.ok || !result.success) throw new Error(result.error || 'Could not update order.')
      await load()
    } catch (e) { setError(e.message) }
  }

  const clearFilters = () => { setPage(1); setQuery(''); setCustomer(''); setStatus(''); setPayment('') }

  return <section className="min-w-0 space-y-5 sm:space-y-6">
    <header><h1 className="font-display text-2xl text-plum sm:text-3xl">Orders</h1><p className="mt-1 text-sm text-muted">Find orders by customer, then open one for full payment and fulfillment details.</p></header>
    {error && <p role="alert" className="rounded-xl bg-bloom/10 p-3 text-sm text-bloom">{error}</p>}
    <div className="grid gap-3 rounded-2xl bg-cream p-4 shadow-soft ring-1 ring-sand sm:grid-cols-2 xl:grid-cols-4">
      <label className="text-xs font-medium text-muted">Search<input value={query} onChange={(event) => { setPage(1); setQuery(event.target.value) }} placeholder="Order, name, email, phone" className="mt-1 min-h-11 w-full rounded-xl border border-sand bg-white px-3 text-sm text-plum" /></label>
      <label className="text-xs font-medium text-muted">Customer email<input type="email" value={customer} onChange={(event) => { setPage(1); setCustomer(event.target.value) }} placeholder="Exact email address" className="mt-1 min-h-11 w-full rounded-xl border border-sand bg-white px-3 text-sm text-plum" /></label>
      <label className="text-xs font-medium text-muted">Order status<select value={status} onChange={(event) => { setPage(1); setStatus(event.target.value) }} className="mt-1 min-h-11 w-full rounded-xl border border-sand bg-white px-3 text-sm text-plum"><option value="">All statuses</option>{STATUSES.map((value) => <option key={value} value={value}>{label(value)}</option>)}</select></label>
      <label className="text-xs font-medium text-muted">Payment status<select value={payment} onChange={(event) => { setPage(1); setPayment(event.target.value) }} className="mt-1 min-h-11 w-full rounded-xl border border-sand bg-white px-3 text-sm text-plum"><option value="">All payment statuses</option>{['PENDING', 'AWAITING_VERIFICATION', 'PAID', 'COD_PENDING_COLLECTION', 'COD_COLLECTED', 'FAILED', 'CANCELLED', 'MANUAL_REVIEW', 'REFUNDED', 'REFUND_REQUESTED'].map((value) => <option key={value} value={value}>{label(value)}</option>)}</select></label>
      <div className="flex items-center justify-between text-sm text-muted sm:col-span-2 xl:col-span-4"><span>{loading ? 'Loading orders…' : `${total} orders`}</span><button type="button" onClick={clearFilters} className="min-h-10 rounded-lg px-3 text-plum underline underline-offset-2">Clear filters</button></div>
    </div>
    {loading ? <p role="status">Loading orders…</p> : orders.length === 0 ? <div className="rounded-2xl bg-cream p-8 text-center text-muted">{total ? 'No orders on this page.' : 'No orders match these filters.'}</div> :
      <div className="space-y-4">{orders.map((order) => <article key={order.id} className="min-w-0 rounded-2xl bg-cream p-4 shadow-soft ring-1 ring-sand sm:p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0"><Link href={`/admin/orders/${order.id}`} className="break-all font-semibold text-plum underline decoration-sand underline-offset-4 hover:decoration-plum">{order.orderNumber}</Link><p className="mt-1 break-words text-sm">{order.customerName} · {order.customerEmail}</p><p className="text-xs text-muted">{new Date(order.createdAt).toLocaleString()}</p></div>
          {canManage ? <label className="text-sm">Fulfillment status<select aria-label={`Status for ${order.orderNumber}`} value={order.status} onChange={(event) => updateStatus(order, event.target.value)} className="mt-1 min-h-11 w-full rounded-lg border border-sand bg-white px-3 sm:ml-2 sm:mt-0 sm:w-auto">{STATUSES.map((value) => {
            const isUpi = order.paymentMethod === 'UPI' || order.paymentMethod?.toLowerCase().includes('upi')
            const isShippedOrBeyond = order.status === 'SHIPPED' || order.status === 'DELIVERED'
            const cannotRevertToInProgress = isShippedOrBeyond && value === 'IN_PROGRESS'
            const cannotConfirmWithoutPaid = value === 'CONFIRMED' && isUpi && order.paymentStatus !== 'PAID'
            const disabled = cannotConfirmWithoutPaid || cannotRevertToInProgress
            return <option key={value} value={value} disabled={disabled}>{label(value)}{cannotConfirmWithoutPaid ? ' (Requires Paid)' : ''}{cannotRevertToInProgress ? ' (Cannot revert once shipped)' : ''}</option>
          })}</select></label> : <span className="rounded-full bg-blush/40 px-3 py-2 text-sm text-plum">{label(order.status)}</span>}
        </div>
        <div className="mt-4 flex flex-col justify-between gap-2 border-t border-sand pt-3 text-sm sm:flex-row"><span className="break-words">{(order.items || []).map((item) => `${item.product?.name || 'Product unavailable'} × ${item.quantity}`).join(', ') || 'No items listed'}</span><strong className="shrink-0 text-plum">₹{order.totalAmount}</strong></div>
        <div className="mt-2 flex flex-wrap items-center justify-between gap-2 pt-1 text-xs">
          <p className="break-words text-muted">Payment: <span className="font-medium text-plum">{order.paymentMethod || 'Not set'}</span> · <span className={`font-semibold ${order.paymentStatus === 'PAID' ? 'text-emerald-700' : order.paymentStatus === 'AWAITING_VERIFICATION' ? 'text-amber-700' : 'text-plum'}`}>{label(order.paymentStatus)}</span>{order.paymentReference ? ` · Ref: ${order.paymentReference}` : ''}</p>
          {canManage && (order.paymentMethod === 'UPI' || order.paymentMethod?.toLowerCase().includes('upi')) && ['AWAITING_VERIFICATION', 'MANUAL_REVIEW'].includes(order.paymentStatus) && (
            <Link href={`/admin/orders/${order.id}`} className="rounded-full bg-amber-100 hover:bg-amber-200 border border-amber-300 px-2.5 py-0.5 text-xs font-semibold text-amber-900 transition">Verify Payment →</Link>
          )}
        </div>
        {order.refundRequests?.map((refund) => <div key={refund.id} className="mt-4 rounded-2xl border border-sand bg-white p-3 text-sm sm:p-4">
          <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-center"><strong className="text-plum">Refund request · {label(refund.status)}</strong><Link href={`/admin/orders/${order.id}`} className="text-sm font-medium text-plum underline underline-offset-2">{canManage ? 'Manage refund and transfer' : 'View refund details'}</Link></div>
          <p className="mt-2 break-words text-muted">₹{refund.amount} · Refund UPI ID: <span className="font-medium text-plum">{refund.refundUpiId}</span></p><p className="mt-1 break-words text-muted">{refund.reason}</p>
        </div>)}
      </article>)}</div>}
    {!loading && <AdminPagination page={page} pageSize={pageSize} total={total} pages={pages} onPageChange={setPage} onPageSizeChange={(value) => { setPage(1); setPageSize(value) }} />}
  </section>
}

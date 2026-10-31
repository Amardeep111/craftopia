'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { ExternalLink, Image as ImageIcon, PackageCheck, CheckCircle2, X, MapPin, Calculator } from 'lucide-react'
import { useAdminAccess } from '../access-context'
import Select from '@/components/ui/Select'
import { STATE_OPTIONS, getStateAndCityFromPin } from '@/lib/address/india'

const statuses = [
  ['NEW', 'New'], ['REVIEWING', 'Reviewing'], ['QUOTED', 'Quote prepared'], ['ACCEPTED', 'Accepted'],
  ['IN_PROGRESS', 'In progress'], ['COMPLETED', 'Completed'], ['DECLINED', 'Declined'],
].map(([value, label]) => ({ value, label }))

const GST_RATES = [
  { value: 0, label: '0% (Exempt / No GST)' },
  { value: 5, label: '5% GST' },
  { value: 12, label: '12% GST' },
  { value: 18, label: '18% GST (Standard)' },
  { value: 28, label: '28% GST' },
]

function getOrderFromNotes(notes) {
  if (!notes) return null
  const match = notes.match(/Order created:\s*([A-Za-z0-9_-]+)(?:\s*\(ID:\s*([A-Za-z0-9_-]+)\))?/)
  if (match) {
    return { orderNumber: match[1], orderId: match[2] || match[1] }
  }
  return null
}

export default function AdminCustomRequests() {
  const { can } = useAdminAccess()
  const canManage = can('customRequests.manage')
  const [requests, setRequests] = useState([])
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(true)
  const [savingId, setSavingId] = useState('')
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  // ── Acceptance Modal State ──
  const [acceptItem, setAcceptItem] = useState(null)
  const [modalSubmitting, setModalSubmitting] = useState(false)
  const [modalError, setModalError] = useState('')
  const [modalForm, setModalForm] = useState({
    basePrice: '',
    gstPercent: 18,
    shippingFee: 0,
    otherCharge: 0,
    customerName: '',
    customerEmail: '',
    customerPhone: '',
    houseFlatBuilding: '',
    areaStreet: '',
    landmark: '',
    city: '',
    state: '',
    pinCode: '',
    paymentMethod: 'UPI',
    estimatedDelivery: '7–10 business days',
    adminNotes: '',
  })

  async function load() {
    setError('')
    try {
      const response = await fetch('/api/admin/custom-requests', { cache: 'no-store' })
      const result = await response.json()
      if (!response.ok || !result.success) throw new Error(result.error || 'Could not load custom requests.')
      setRequests(result.data)
    } catch (cause) {
      setError(cause.message || 'Could not load custom requests.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  function update(id, patch) {
    setRequests((items) => items.map((item) => (item.id === id ? { ...item, ...patch } : item)))
  }

  function openAcceptModal(item) {
    const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(item.contact || '')
    const isPhone = /^\+?\d{10,15}$/.test((item.contact || '').replace(/\s+/g, ''))
    setAcceptItem(item)
    setModalError('')
    setModalForm({
      basePrice: item.quotedPrice || '',
      gstPercent: 18,
      shippingFee: 0,
      otherCharge: 0,
      customerName: item.name || '',
      customerEmail: isEmail ? item.contact : item.user?.email || '',
      customerPhone: isPhone ? item.contact : item.user?.phone || '',
      houseFlatBuilding: '',
      areaStreet: '',
      landmark: '',
      city: '',
      state: '',
      pinCode: '',
      paymentMethod: 'UPI',
      estimatedDelivery: '7–10 business days',
      adminNotes: item.adminNotes || '',
    })
  }

  function handleModalPinChange(pin) {
    const next = { ...modalForm, pinCode: pin }
    if (pin.replace(/\D/g, '').length >= 3) {
      const detected = getStateAndCityFromPin(pin)
      if (detected.state) next.state = detected.state
      if (detected.city && !modalForm.city) next.city = detected.city
    }
    setModalForm(next)
  }

  async function handleAcceptSubmit(e) {
    e.preventDefault()
    setModalError('')
    const basePriceNum = Math.max(0, Math.round(Number(modalForm.basePrice || 0)))
    if (!basePriceNum || basePriceNum < 1) {
      setModalError('Please enter a valid base price (₹1 or more).')
      return
    }
    if (!modalForm.customerName?.trim()) {
      setModalError('Please enter the customer name.')
      return
    }
    if (!modalForm.customerEmail?.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(modalForm.customerEmail.trim())) {
      setModalError('Please enter a valid customer email address.')
      return
    }

    setModalSubmitting(true)
    try {
      const response = await fetch('/api/admin/custom-requests', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: acceptItem.id,
          status: 'ACCEPTED',
          createOrder: true,
          adminNotes: modalForm.adminNotes || '',
          orderDetails: {
            basePrice: basePriceNum,
            gstPercent: Number(modalForm.gstPercent || 0),
            shippingFee: Number(modalForm.shippingFee || 0),
            otherCharge: Number(modalForm.otherCharge || 0),
            customerName: modalForm.customerName.trim(),
            customerEmail: modalForm.customerEmail.trim(),
            customerPhone: modalForm.customerPhone?.trim() || '',
            shippingAddress: {
              fullName: modalForm.customerName.trim(),
              mobileNumber: modalForm.customerPhone?.trim() || '',
              houseFlatBuilding: modalForm.houseFlatBuilding.trim(),
              areaStreet: modalForm.areaStreet.trim(),
              landmark: modalForm.landmark.trim(),
              city: modalForm.city.trim(),
              state: modalForm.state.trim(),
              pinCode: modalForm.pinCode.trim(),
            },
            paymentMethod: modalForm.paymentMethod,
            estimatedDelivery: modalForm.estimatedDelivery.trim(),
            adminNotes: modalForm.adminNotes.trim(),
          },
        }),
      })
      const result = await response.json()
      if (!response.ok || !result.success) throw new Error(result.error || 'Failed to accept request and create order.')

      setAcceptItem(null)
      setNotice(`Request accepted! Order ${result.order?.orderNumber || ''} created and quote email sent to ${modalForm.customerEmail}.`)
      await load()
    } catch (err) {
      setModalError(err.message || 'Could not complete order creation.')
    } finally {
      setModalSubmitting(false)
    }
  }

  async function save(item) {
    if (item.status === 'ACCEPTED') {
      openAcceptModal(item)
      return
    }
    setSavingId(item.id)
    setError('')
    setNotice('')
    try {
      const response = await fetch('/api/admin/custom-requests', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: item.id,
          status: item.status,
          quotedPrice: item.quotedPrice ?? '',
          adminNotes: item.adminNotes || '',
        }),
      })
      const result = await response.json()
      if (!response.ok || !result.success) throw new Error(result.error || 'Could not save this request.')
      update(item.id, result.data)
      setNotice(`Request from ${item.name} updated.`)
    } catch (cause) {
      setError(cause.message || 'Could not save this request.')
    } finally {
      setSavingId('')
    }
  }

  const filtered = useMemo(() => {
    const value = query.trim().toLowerCase()
    if (!value) return requests
    return requests.filter((item) =>
      [item.name, item.contact, item.idea, item.category, item.status].some((part) =>
        String(part || '').toLowerCase().includes(value)
      )
    )
  }, [requests, query])

  // Computed modal calculations
  const modalBasePrice = Math.max(0, Math.round(Number(modalForm.basePrice || 0)))
  const modalGstAmount = Math.round((modalBasePrice * Number(modalForm.gstPercent || 0)) / 100)
  const modalShipping = Math.max(0, Math.round(Number(modalForm.shippingFee || 0)))
  const modalOther = Math.max(0, Math.round(Number(modalForm.otherCharge || 0)))
  const modalTotal = modalBasePrice + modalGstAmount + modalShipping + modalOther

  return (
    <section className="space-y-5">
      <header>
        <h1 className="font-display text-3xl text-plum">Custom requests</h1>
        <p className="mt-1 text-sm text-muted">
          Review customer ideas, reference photos, accept quotes with GST, and create orders for seamless management.
        </p>
      </header>

      {error && <p role="alert" className="rounded-xl bg-bloom/10 p-3 text-sm text-bloom">{error}</p>}
      {notice && <p role="status" className="rounded-xl bg-sage/20 p-3 text-sm text-plum">{notice}</p>}

      <label className="block max-w-lg text-sm text-muted">
        Search requests
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Name, contact, idea, or status"
          className="mt-1.5 min-h-11 w-full rounded-xl border border-sand bg-white px-3 text-sm text-plum"
        />
      </label>

      {loading ? (
        <p role="status">Loading custom requests…</p>
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl bg-cream p-8 text-center shadow-soft ring-1 ring-sand">
          <h2 className="font-display text-xl text-plum">
            {requests.length ? 'No requests match' : 'No custom requests yet'}
          </h2>
          <p className="mt-2 text-sm text-muted">New custom order ideas will appear here.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map((item) => {
            const orderInfo = getOrderFromNotes(item.adminNotes)
            const isTerminal = ['COMPLETED', 'DECLINED'].includes(item.status)

            return (
              <article key={item.id} className="min-w-0 space-y-4 rounded-2xl bg-cream p-4 shadow-soft ring-1 ring-sand sm:p-6">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h2 className="break-words font-display text-xl text-plum">{item.idea}</h2>
                    <p className="mt-1 text-xs text-muted">
                      Received {new Date(item.createdAt).toLocaleString()} · {item.category || 'No category'}
                      {item.quotedPrice ? ` · Quoted total ₹${Number(item.quotedPrice).toLocaleString('en-IN')}` : ''}
                    </p>
                  </div>
                  <span className="rounded-full bg-plum/10 px-3 py-1 text-xs font-semibold text-plum">
                    {statuses.find((status) => status.value === item.status)?.label || item.status}
                  </span>
                </div>

                {/* Linked Order Banner */}
                {orderInfo && (
                  <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-sage/40 bg-sage/10 p-3 text-xs">
                    <div>
                      <p className="font-semibold text-emerald-900">✓ Linked Order: {orderInfo.orderNumber}</p>
                      <p className="text-emerald-800/80">Manage payment verification and fulfillment in the Orders panel.</p>
                    </div>
                    <Link
                      href={`/admin/orders/${orderInfo.orderId}`}
                      className="inline-flex items-center gap-1 rounded-lg bg-emerald-700 px-3 py-1.5 font-semibold text-white hover:bg-emerald-800 transition shadow-xs"
                    >
                      Manage Order Details →
                    </Link>
                  </div>
                )}

                <dl className="grid gap-3 border-y border-sand py-4 text-sm sm:grid-cols-2">
                  <div>
                    <dt className="text-xs text-muted">Customer</dt>
                    <dd className="font-medium text-plum">{item.name}</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-muted">Reply to</dt>
                    <dd className="break-all font-medium text-plum">{item.contact}</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-muted">Colours</dt>
                    <dd>{item.colors || 'Not specified'}</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-muted">Budget · Occasion</dt>
                    <dd>{[item.budget, item.occasion].filter(Boolean).join(' · ') || 'Not specified'}</dd>
                  </div>
                  <div className="sm:col-span-2">
                    <dt className="text-xs text-muted">Details</dt>
                    <dd className="whitespace-pre-wrap">{item.details}</dd>
                  </div>
                </dl>

                {item.referenceImages?.length > 0 ? (
                  <div>
                    <h3 className="flex items-center gap-2 text-sm font-semibold text-plum">
                      <ImageIcon className="h-4 w-4" /> Reference photos
                    </h3>
                    <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3">
                      {item.referenceImages.map((url, index) => (
                        <a
                          key={url}
                          href={url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="group relative block aspect-square overflow-hidden rounded-xl border border-sand bg-white"
                        >
                          <img
                            src={url}
                            alt={`Customer reference ${index + 1}`}
                            className="h-full w-full object-cover transition group-hover:scale-105"
                          />
                          <span className="absolute bottom-2 right-2 rounded-full bg-white/95 p-2 text-plum shadow">
                            <ExternalLink className="h-3.5 w-3.5" />
                          </span>
                        </a>
                      ))}
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-muted">No reference photos attached.</p>
                )}

                {canManage && (
                  <div className="border-t border-sand pt-4 space-y-3">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      {/* Prominent Action Button: Accept & Create Order */}
                      {!orderInfo && !isTerminal && item.status !== 'ACCEPTED' && (
                        <button
                          type="button"
                          onClick={() => openAcceptModal(item)}
                          className="min-h-11 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white px-5 text-sm font-semibold transition flex items-center gap-2 shadow-xs"
                        >
                          <PackageCheck className="h-4 w-4" />
                          Accept & Create Order
                        </button>
                      )}
                    </div>

                    <div className="grid items-end gap-3 sm:grid-cols-[13rem_9rem_minmax(0,1fr)_auto]">
                      <div>
                        <Select
                          label="Request status"
                          options={statuses}
                          value={item.status}
                          onChange={(value) => {
                            if (value === 'ACCEPTED') {
                              openAcceptModal(item)
                            } else {
                              update(item.id, { status: value })
                            }
                          }}
                        />
                      </div>
                      <label className="block text-sm font-medium text-plum">
                        Quoted Price (₹)
                        <input
                          type="number"
                          min="1"
                          max="10000000"
                          step="1"
                          value={item.quotedPrice ?? ''}
                          onChange={(event) =>
                            update(item.id, {
                              quotedPrice: event.target.value === '' ? '' : Number(event.target.value),
                            })
                          }
                          placeholder="Price in ₹"
                          className="mt-1.5 min-h-11 w-full rounded-xl border border-sand bg-white px-3 text-sm"
                        />
                      </label>
                      <label className="block text-sm font-medium text-plum">
                        Internal notes
                        <textarea
                          maxLength={2000}
                          rows={2}
                          value={item.adminNotes || ''}
                          onChange={(event) => update(item.id, { adminNotes: event.target.value })}
                          placeholder="Private follow-up notes"
                          className="mt-1.5 w-full rounded-xl border border-sand bg-white px-3 py-2 text-sm"
                        />
                      </label>
                      <button
                        type="button"
                        disabled={savingId === item.id}
                        onClick={() => save(item)}
                        className="min-h-11 rounded-full bg-plum px-5 text-sm font-semibold text-cream disabled:opacity-60"
                      >
                        {savingId === item.id ? 'Saving…' : 'Save update'}
                      </button>
                      <p className="text-xs leading-5 text-muted sm:col-span-4">
                        Accepting opens the order creation dialog to set GST and delivery info, then creates an Order and sends the customer an email with the price breakdown and payment details.
                      </p>
                    </div>
                  </div>
                )}
              </article>
            )
          })}
        </div>
      )}

      {/* ── ACCEPT CUSTOM REQUEST & CREATE ORDER MODAL ── */}
      {acceptItem && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <button
            type="button"
            className="fixed inset-0 bg-plum/40 backdrop-blur-[2px] transition-opacity"
            aria-label="Close dialog"
            onClick={() => setAcceptItem(null)}
          />

          <div
            role="dialog"
            aria-modal="true"
            className="relative z-10 w-full max-w-3xl rounded-3xl bg-cream p-5 shadow-lift sm:p-7 max-h-[92vh] overflow-y-auto"
          >
            <div className="flex items-start justify-between gap-4 border-b border-sand pb-4">
              <div>
                <div className="flex items-center gap-2">
                  <PackageCheck className="h-5 w-5 text-emerald-700" />
                  <h2 className="font-display text-2xl text-plum">Accept Request & Create Order</h2>
                </div>
                <p className="mt-1 text-xs text-muted">
                  For: <strong className="text-plum">{acceptItem.name}</strong> · Idea: “{acceptItem.idea}”
                </p>
              </div>
              <button
                type="button"
                onClick={() => setAcceptItem(null)}
                className="rounded-full p-2 text-plum transition hover:bg-sand/40"
                aria-label="Close"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {modalError && (
              <p role="alert" className="mt-4 rounded-xl bg-bloom/10 p-3 text-sm text-bloom">
                {modalError}
              </p>
            )}

            <form onSubmit={handleAcceptSubmit} className="mt-5 space-y-6">
              {/* SECTION 1: PRICING & GST BREAKDOWN */}
              <div>
                <h3 className="flex items-center gap-2 text-sm font-semibold text-plum mb-3">
                  <Calculator className="h-4 w-4" /> Pricing & GST Breakdown
                </h3>
                <div className="grid gap-3 sm:grid-cols-4">
                  <div>
                    <label className="block text-xs font-medium text-plum">
                      Base Item Price (₹)*
                      <input
                        type="number"
                        min="1"
                        step="1"
                        required
                        value={modalForm.basePrice}
                        onChange={(e) => setModalForm({ ...modalForm, basePrice: e.target.value })}
                        placeholder="e.g. 1500"
                        className="mt-1 min-h-10 w-full rounded-xl border border-sand bg-white px-3 text-sm text-plum font-semibold"
                      />
                    </label>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-plum">
                      GST Rate (%)
                      <select
                        value={modalForm.gstPercent}
                        onChange={(e) => setModalForm({ ...modalForm, gstPercent: Number(e.target.value) })}
                        className="mt-1 min-h-10 w-full rounded-xl border border-sand bg-white px-3 text-sm text-plum"
                      >
                        {GST_RATES.map((rate) => (
                          <option key={rate.value} value={rate.value}>
                            {rate.label}
                          </option>
                        ))}
                      </select>
                    </label>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-plum">
                      Shipping Fee (₹)
                      <input
                        type="number"
                        min="0"
                        step="1"
                        value={modalForm.shippingFee}
                        onChange={(e) => setModalForm({ ...modalForm, shippingFee: e.target.value })}
                        placeholder="0"
                        className="mt-1 min-h-10 w-full rounded-xl border border-sand bg-white px-3 text-sm text-plum"
                      />
                    </label>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-plum">
                      Packaging / Other (₹)
                      <input
                        type="number"
                        min="0"
                        step="1"
                        value={modalForm.otherCharge}
                        onChange={(e) => setModalForm({ ...modalForm, otherCharge: e.target.value })}
                        placeholder="0"
                        className="mt-1 min-h-10 w-full rounded-xl border border-sand bg-white px-3 text-sm text-plum"
                      />
                    </label>
                  </div>
                </div>

                {/* Live Calculated Totals Card */}
                <div className="mt-3 rounded-2xl border border-sand/80 bg-white/80 p-3.5 text-xs text-plum">
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    <div>
                      <span className="text-muted block">Base Price:</span>
                      <strong className="text-sm">₹{modalBasePrice.toLocaleString('en-IN')}</strong>
                    </div>
                    <div>
                      <span className="text-muted block">GST ({modalForm.gstPercent}%):</span>
                      <strong className="text-sm">₹{modalGstAmount.toLocaleString('en-IN')}</strong>
                    </div>
                    <div>
                      <span className="text-muted block">Shipping & Other:</span>
                      <strong className="text-sm">₹{(modalShipping + modalOther).toLocaleString('en-IN')}</strong>
                    </div>
                    <div className="border-l border-sand/80 pl-3">
                      <span className="text-emerald-800 font-medium block">Total Payable:</span>
                      <strong className="text-base text-emerald-900">₹{modalTotal.toLocaleString('en-IN')}</strong>
                    </div>
                  </div>
                </div>
              </div>

              {/* SECTION 2: CUSTOMER CONTACT & DELIVERY */}
              <div className="border-t border-sand pt-4">
                <h3 className="flex items-center gap-2 text-sm font-semibold text-plum mb-3">
                  <MapPin className="h-4 w-4" /> Customer & Delivery Details
                </h3>
                <div className="grid gap-3 sm:grid-cols-3">
                  <div>
                    <label className="block text-xs font-medium text-plum">
                      Customer Full Name*
                      <input
                        type="text"
                        required
                        value={modalForm.customerName}
                        onChange={(e) => setModalForm({ ...modalForm, customerName: e.target.value })}
                        className="mt-1 min-h-10 w-full rounded-xl border border-sand bg-white px-3 text-sm text-plum"
                      />
                    </label>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-plum">
                      Email Address*
                      <input
                        type="email"
                        required
                        value={modalForm.customerEmail}
                        onChange={(e) => setModalForm({ ...modalForm, customerEmail: e.target.value })}
                        className="mt-1 min-h-10 w-full rounded-xl border border-sand bg-white px-3 text-sm text-plum"
                      />
                    </label>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-plum">
                      Mobile Number
                      <input
                        type="tel"
                        value={modalForm.customerPhone}
                        onChange={(e) => setModalForm({ ...modalForm, customerPhone: e.target.value })}
                        placeholder="10-digit number"
                        className="mt-1 min-h-10 w-full rounded-xl border border-sand bg-white px-3 text-sm text-plum"
                      />
                    </label>
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-xs font-medium text-plum">
                      House / Flat / Building
                      <input
                        type="text"
                        value={modalForm.houseFlatBuilding}
                        onChange={(e) => setModalForm({ ...modalForm, houseFlatBuilding: e.target.value })}
                        placeholder="e.g. Flat 302, Green Villa"
                        className="mt-1 min-h-10 w-full rounded-xl border border-sand bg-white px-3 text-sm text-plum"
                      />
                    </label>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-plum">
                      Area / Street
                      <input
                        type="text"
                        value={modalForm.areaStreet}
                        onChange={(e) => setModalForm({ ...modalForm, areaStreet: e.target.value })}
                        placeholder="e.g. 5th Cross Road"
                        className="mt-1 min-h-10 w-full rounded-xl border border-sand bg-white px-3 text-sm text-plum"
                      />
                    </label>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-plum">
                      PIN Code
                      <input
                        type="text"
                        maxLength={6}
                        value={modalForm.pinCode}
                        onChange={(e) => handleModalPinChange(e.target.value)}
                        placeholder="6-digit PIN"
                        className="mt-1 min-h-10 w-full rounded-xl border border-sand bg-white px-3 text-sm text-plum"
                      />
                    </label>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-plum">
                      City
                      <input
                        type="text"
                        value={modalForm.city}
                        onChange={(e) => setModalForm({ ...modalForm, city: e.target.value })}
                        className="mt-1 min-h-10 w-full rounded-xl border border-sand bg-white px-3 text-sm text-plum"
                      />
                    </label>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-plum">
                      State
                      <select
                        value={modalForm.state}
                        onChange={(e) => setModalForm({ ...modalForm, state: e.target.value })}
                        className="mt-1 min-h-10 w-full rounded-xl border border-sand bg-white px-3 text-sm text-plum"
                      >
                        <option value="">Select state</option>
                        {STATE_OPTIONS.map((st) => (
                          <option key={st.value} value={st.value}>
                            {st.label}
                          </option>
                        ))}
                      </select>
                    </label>
                  </div>
                </div>
              </div>

              {/* SECTION 3: FULFILLMENT & PAYMENT */}
              <div className="border-t border-sand pt-4">
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <label className="block text-xs font-medium text-plum">
                      Payment Method
                      <select
                        value={modalForm.paymentMethod}
                        onChange={(e) => setModalForm({ ...modalForm, paymentMethod: e.target.value })}
                        className="mt-1 min-h-10 w-full rounded-xl border border-sand bg-white px-3 text-sm text-plum"
                      >
                        <option value="UPI">UPI (Customer pays via UPI link)</option>
                        <option value="Cash on Delivery">Cash on Delivery</option>
                      </select>
                    </label>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-plum">
                      Estimated Crafting & Delivery
                      <input
                        type="text"
                        value={modalForm.estimatedDelivery}
                        onChange={(e) => setModalForm({ ...modalForm, estimatedDelivery: e.target.value })}
                        placeholder="e.g. 7–10 business days"
                        className="mt-1 min-h-10 w-full rounded-xl border border-sand bg-white px-3 text-sm text-plum"
                      />
                    </label>
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-medium text-plum">
                      Internal Notes
                      <textarea
                        rows={2}
                        maxLength={1000}
                        value={modalForm.adminNotes}
                        onChange={(e) => setModalForm({ ...modalForm, adminNotes: e.target.value })}
                        placeholder="Special artisan instructions, yarn colours, or customer preferences"
                        className="mt-1 w-full rounded-xl border border-sand bg-white px-3 py-2 text-sm text-plum"
                      />
                    </label>
                  </div>
                </div>
              </div>

              {/* MODAL FOOTER */}
              <div className="border-t border-sand pt-4 flex flex-col-reverse sm:flex-row items-center justify-end gap-3">
                <button
                  type="button"
                  disabled={modalSubmitting}
                  onClick={() => setAcceptItem(null)}
                  className="w-full sm:w-auto min-h-11 rounded-full border border-sand px-5 text-sm font-semibold text-plum hover:bg-sand/30 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={modalSubmitting}
                  className="w-full sm:w-auto min-h-11 rounded-full bg-emerald-700 hover:bg-emerald-800 text-white px-6 text-sm font-semibold transition disabled:opacity-60 shadow-sm flex items-center justify-center gap-2"
                >
                  <CheckCircle2 className="h-4 w-4" />
                  {modalSubmitting ? 'Creating Order…' : `Accept & Create Order (₹${modalTotal.toLocaleString('en-IN')})`}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </section>
  )
}

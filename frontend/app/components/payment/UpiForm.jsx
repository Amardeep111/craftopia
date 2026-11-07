'use client'

import { useEffect, useState } from 'react'
import {
  AlertCircle,
  Check,
  CheckCircle2,
  Copy,
  Loader2,
  MessageCircle,
  ShieldCheck,
  Smartphone,
} from 'lucide-react'
import { formatPrice } from '@/data/products'
import { api } from '@/lib/api/client'

function supportsUpiAppOpen() {
  if (typeof window === 'undefined') return false
  const ua = navigator.userAgent || ''
  const mobileUserAgent = /Android|iPhone|iPad|iPod|Mobile|IEMobile|Windows Phone/i.test(ua)
  const touchFoldableWidth = navigator.maxTouchPoints > 0 && window.matchMedia('(max-width: 1024px)').matches
  return (mobileUserAgent && window.matchMedia('(max-width: 1200px)').matches) || touchFoldableWidth || window.innerWidth <= 768
}

export default function UpiForm({ total, orderId, onSubmit, loading, error }) {
  const [merchant, setMerchant] = useState(null)
  const [isMobile, setIsMobile] = useState(false)
  const [configurationError, setConfigurationError] = useState('')
  const [utr, setUtr] = useState('')
  const [copiedVpa, setCopiedVpa] = useState(false)

  const amount = Math.max(0, Number(total) || 0).toFixed(2)
  const formattedTotal = formatPrice(total)
  const transactionNote = orderId ? `Order ${orderId}` : "Jamae's Craftopia order"

  useEffect(() => {
    setIsMobile(supportsUpiAppOpen())
    api.payment
      .getUPIDetails(amount, orderId)
      .then((data) => {
        if (!data || !data.vpa) throw new Error('UPI payments are not configured yet.')
        setMerchant(data)
      })
      .catch((err) => setConfigurationError(err.message || 'Could not load UPI details.'))
  }, [amount, orderId])

  const upiDeepLink = merchant?.deepLink || (merchant
    ? `upi://pay?pa=${merchant.vpa.trim()}&pn=${encodeURIComponent(merchant.name.trim())}&am=${amount}&cu=INR&tn=${encodeURIComponent(transactionNote)}`
    : '')

  const whatsappNumber = merchant?.whatsappNumber || ''

  async function handleCopyVpa() {
    if (!merchant?.vpa) return
    try {
      await navigator.clipboard.writeText(merchant.vpa.trim())
      setCopiedVpa(true)
      setTimeout(() => setCopiedVpa(false), 2000)
    } catch {
      /* ignore */
    }
  }

  function handlePlaceOrder(openWhatsApp = false) {
    if (loading) return
    onSubmit?.({
      paymentReference: utr.trim() || null,
      whatsappNumber,
      openWhatsApp,
    })
  }

  if (configurationError) {
    return (
      <div role="alert" className="flex items-start gap-3 rounded-2xl bg-peach/20 p-4 text-sm text-plum">
        <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-bloom" />
        <p>{configurationError}</p>
      </div>
    )
  }

  if (!merchant) {
    return (
      <div role="status" className="flex items-center gap-3 rounded-2xl bg-ivory/80 p-5 text-sm text-plum animate-pulse">
        <Loader2 className="h-5 w-5 animate-spin text-plum" />
        <p>Loading secure UPI payment details…</p>
      </div>
    )
  }

  return (
    <div className="space-y-5">
      {/* Header bar: Amount highlight */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-sand/60 pb-3">
        <div className="flex items-center gap-2">
          <CheckCircle2 className="h-5 w-5 text-sage" aria-hidden="true" />
          <span className="font-semibold text-plum">Amount to pay:</span>
          <span className="font-display text-xl font-bold text-plum">{formattedTotal}</span>
        </div>
        <span className="rounded-full bg-sage/15 px-3 py-1 text-xs font-semibold text-sage">
          Zero extra fee
        </span>
      </div>

      {/* 1-Tap Mobile UPI App Opener (GPay, PhonePe, Paytm, BHIM) */}
      {isMobile && upiDeepLink && (
        <div className="rounded-2xl border border-plum/20 bg-plum/5 p-4 text-center">
          <p className="text-xs font-medium text-plum/80 mb-2.5">
            Paying from this phone? Tap below to launch your UPI app directly:
          </p>
          <a
            href={upiDeepLink}
            className="flex w-full items-center justify-center gap-2.5 rounded-xl bg-plum px-5 py-3.5 text-base font-semibold text-cream shadow-soft transition hover:bg-ink active:scale-[0.99]"
          >
            <Smartphone className="h-5 w-5 shrink-0" aria-hidden="true" />
            <span>Open UPI App to Pay ({formattedTotal})</span>
          </a>
          <p className="mt-2 text-[11px] text-muted">Supports Google Pay, PhonePe, Paytm, BHIM, and bank UPI apps.</p>
        </div>
      )}

      {/* QR Code & Payee Details in clean compact layout */}
      <div className="grid gap-4 sm:grid-cols-[auto_1fr] sm:items-center rounded-2xl bg-ivory/60 border border-sand/70 p-4 sm:p-5">
        {/* QR Code */}
        <div className="flex flex-col items-center justify-center">
          <div className="rounded-xl bg-white p-2.5 shadow-sm ring-1 ring-sand">
            <img
              src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(upiDeepLink)}`}
              alt={`Scan UPI QR to pay ${formattedTotal}`}
              className="h-36 w-36 sm:h-40 sm:w-40 rounded-lg"
              loading="eager"
            />
          </div>
          <p className="mt-1.5 text-[11px] text-muted text-center">
            {isMobile ? 'Or scan from another phone' : 'Scan with GPay, PhonePe, Paytm'}
          </p>
        </div>

        {/* Payee Info & Steps */}
        <div className="min-w-0 space-y-3">
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-muted">Merchant Name</p>
            <p className="font-display text-base font-bold text-plum">{merchant.name}</p>
          </div>

          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-muted">UPI ID / VPA</p>
            <div className="mt-1 flex items-center gap-2 flex-wrap">
              <code className="rounded-lg bg-white px-2.5 py-1 text-sm font-mono font-semibold text-plum border border-sand">
                {merchant.vpa}
              </code>
              <button
                type="button"
                onClick={handleCopyVpa}
                className="inline-flex items-center gap-1 rounded-lg border border-sand bg-white px-2.5 py-1 text-xs font-medium text-plum hover:bg-cream transition"
                title="Copy UPI ID"
              >
                {copiedVpa ? (
                  <>
                    <Check className="h-3.5 w-3.5 text-sage" aria-hidden="true" />
                    <span className="text-sage font-semibold">Copied</span>
                  </>
                ) : (
                  <>
                    <Copy className="h-3.5 w-3.5 text-muted" aria-hidden="true" />
                    <span>Copy</span>
                  </>
                )}
              </button>
            </div>
          </div>

          <ol className="space-y-1.5 text-xs text-ink/85 border-t border-sand/50 pt-2.5">
            <li className="flex items-start gap-1.5">
              <strong className="text-bloom">1.</strong>
              <span>{isMobile ? 'Tap the "Open UPI App" button above, or copy the UPI ID.' : 'Scan the QR code or copy the UPI ID above.'}</span>
            </li>
            <li className="flex items-start gap-1.5">
              <strong className="text-bloom">2.</strong>
              <span>Pay <strong>{formattedTotal}</strong> in your UPI app.</span>
            </li>
            <li className="flex items-start gap-1.5">
              <strong className="text-bloom">3.</strong>
              <span>Enter your UTR number below and place your order.</span>
            </li>
          </ol>
        </div>
      </div>

      {/* UTR Reference Input */}
      <div className="space-y-1.5">
        <label className="block text-sm font-medium text-plum" htmlFor="upi-utr">
          UPI Reference / UTR Number <span className="text-xs font-normal text-muted">(Optional, recommended)</span>
        </label>
        <input
          id="upi-utr"
          type="text"
          value={utr}
          onChange={(e) => setUtr(e.target.value.replace(/[^a-zA-Z0-9]/g, ''))}
          maxLength={40}
          autoComplete="off"
          placeholder="e.g. 431289567123 (12-digit UTR from your bank or UPI app)"
          className="w-full rounded-xl border border-sand bg-white px-3.5 py-2.5 font-mono text-sm tracking-wide text-plum placeholder:font-sans placeholder:text-muted placeholder:tracking-normal focus:border-bloom focus:outline-none focus:ring-2 focus:ring-bloom/20"
        />
        <p className="text-[11px] text-muted">
          Entering your UTR number allows our team to verify and confirm your order promptly.
        </p>
      </div>

      {error && (
        <div role="alert" className="rounded-xl bg-peach/30 p-3 text-sm text-bloom">
          {error}
        </div>
      )}

      {/* Action Buttons */}
      <div className="space-y-2.5 pt-1">
        {/* Primary CTA: Place order */}
        <button
          type="button"
          disabled={loading}
          onClick={() => handlePlaceOrder(false)}
          className="w-full inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-plum px-6 py-3 font-semibold text-cream shadow-soft transition hover:bg-ink hover:shadow-lift disabled:pointer-events-none disabled:opacity-60"
        >
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              <span>Placing your order…</span>
            </>
          ) : (
            <span>I’ve Paid — Place Order ({formattedTotal})</span>
          )}
        </button>

        {/* Secondary CTA: Place & Send proof on WhatsApp */}
        {whatsappNumber && (
          <button
            type="button"
            disabled={loading}
            onClick={() => handlePlaceOrder(true)}
            className="w-full inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-[#25D366] px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:brightness-105 disabled:pointer-events-none disabled:opacity-60"
            title="Place order and automatically open WhatsApp with your Order ID prefilled"
          >
            <MessageCircle className="h-4 w-4" aria-hidden="true" />
            <span>Place Order & Share Receipt on WhatsApp</span>
          </button>
        )}
      </div>

      {/* Reassurance note */}
      <div className="flex items-center justify-center gap-1.5 text-center text-xs text-muted">
        <ShieldCheck className="h-4 w-4 text-sage" aria-hidden="true" />
        <span>Your order is reserved once placed. We confirm and begin crafting after checking the transfer.</span>
      </div>
    </div>
  )
}

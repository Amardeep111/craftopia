'use client'

import { useEffect, useState } from 'react'
import { AlertCircle, CheckCircle2, MessageCircle, Smartphone } from 'lucide-react'
import { formatPrice } from '@/data/products'
import { site } from '@/data/site'
import { api } from '@/lib/api/client'

function supportsUpiAppOpen() {
  if (typeof window === 'undefined') return false
  const ua = navigator.userAgent || ''
  const mobileUserAgent = /Android|iPhone|iPad|iPod|Mobile|IEMobile|Windows Phone/i.test(ua)
  const touchFoldableWidth = navigator.maxTouchPoints > 0 && window.matchMedia('(max-width: 1024px)').matches
  return (mobileUserAgent && window.matchMedia('(max-width: 1200px)').matches) || touchFoldableWidth
}

export default function UpiForm({ total, orderId, onSubmit, loading }) {
  const [merchant, setMerchant] = useState(null)
  const [isMobile, setIsMobile] = useState(false)
  const [configurationError, setConfigurationError] = useState('')
  const [utr, setUtr] = useState('')

  const amount = Math.max(0, Number(total) || 0).toFixed(2)
  const transactionNote = orderId ? `Order ${orderId}` : "Jamae's Craftopia order"

  useEffect(() => {
    setIsMobile(supportsUpiAppOpen())
    api.payment.getUPIDetails(amount, orderId)
      .then((data) => {
        if (!data || !data.vpa) throw new Error('UPI payments are not configured yet.')
        setMerchant(data)
      })
      .catch((error) => setConfigurationError(error.message))
  }, [amount, orderId])
  const upiDeepLink = merchant
    ? `upi://pay?pa=${merchant.vpa.trim()}&pn=${merchant.name.trim()}&am=${amount}&cu=INR&tn=${transactionNote}`
    : ''
  const whatsappNumber = merchant?.whatsappNumber || ''
  const whatsappMessage = `Hi! I have paid ₹${amount} to ${merchant?.vpa || "Jamae's Craftopia"} via UPI. I will share the payment screenshot and UTR here for confirmation.`
  const whatsappUrl = whatsappNumber ? `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(whatsappMessage)}` : ''

  if (!merchant) {
    return <div role="status" className="flex items-start gap-3 rounded-2xl bg-peach/20 p-4 text-sm text-plum"><AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-bloom" /><p>{configurationError || 'Loading secure UPI payment details…'}</p></div>
  }

  return <section aria-label="UPI payment instructions" className="rounded-3xl border border-sand bg-ivory/60 p-5 sm:p-6">
    <div className="flex items-center gap-2"><CheckCircle2 className="h-5 w-5 text-sage" aria-hidden="true" /><h3 className="font-display text-lg text-plum">Pay ₹{amount} with UPI</h3></div>
    <div className="mt-5 grid gap-5 md:grid-cols-[auto_1fr] md:items-center">
      <div className="mx-auto rounded-2xl bg-white p-3 shadow-sm ring-1 ring-sand">
        <img src={`https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(upiDeepLink)}`} alt={`UPI payment QR for ₹${amount}`} className="h-48 w-48 rounded-lg" />
      </div>
      <div>
        <p className="font-semibold text-plum">{merchant.name}</p><p className="mt-1 text-sm text-muted">UPI ID: {merchant.vpa}</p>
        <ol className="mt-4 space-y-2 text-sm text-ink">
          <li><strong>1.</strong> Scan this QR with your UPI app and pay the exact amount shown.</li>
          <li><strong>2.</strong> After paying, send the payment screenshot and UTR/reference number to us on WhatsApp.</li>
          <li><strong>3.</strong> We will confirm the payment after checking it.</li>
        </ol>
      </div>
    </div>
    {isMobile && <a href={upiDeepLink} className="mt-5 flex w-full items-center justify-center gap-2 rounded-full bg-plum px-5 py-3 font-semibold text-cream shadow-soft transition hover:bg-ink"><Smartphone className="h-4 w-4" aria-hidden="true" />Open UPI App</a>}
    {whatsappUrl ? <a href={whatsappUrl} target="_blank" rel="noopener noreferrer" className="mt-3 flex w-full items-center justify-center gap-2 rounded-full bg-[#25D366] px-5 py-3 font-semibold text-white shadow-soft transition hover:brightness-110"><MessageCircle className="h-4 w-4" aria-hidden="true" />Send payment proof on WhatsApp</a> : <p className="mt-4 rounded-xl bg-peach/20 p-3 text-sm text-plum">After payment, contact us with your screenshot and UTR: {site.email}</p>}
    <label className="mt-5 block text-sm font-medium text-plum" htmlFor="upi-utr">UPI transaction reference (optional)</label>
    <input id="upi-utr" value={utr} onChange={(event) => setUtr(event.target.value)} maxLength={80} autoComplete="off" className="mt-2 w-full rounded-xl border border-sand bg-white px-4 py-3 text-sm" placeholder="Enter the UTR / reference number" />
    <button type="button" disabled={loading} onClick={() => onSubmit?.({ paymentReference: utr.trim() || null, whatsappNumber })} className="mt-4 w-full rounded-full bg-plum px-5 py-3 font-semibold text-cream disabled:opacity-60">{loading ? 'Placing order…' : 'I’ve paid — place order'}</button>
    <p className="mt-3 text-center text-xs text-muted">Your order will show payment pending until we verify the transfer. Please send the payment proof using WhatsApp above.</p>
  </section>
}

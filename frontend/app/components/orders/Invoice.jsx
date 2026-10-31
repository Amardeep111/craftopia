/**
 * Invoice — print-friendly invoice render.
 *
 * Use `<Invoice order={order} />` inside any page. The component renders
 * semantically with <table>, <dl>, and ink-friendly typography so `window.print()`
 * produces a clean PDF (or paper copy) without extra CSS.
 *
 * The "Save as PDF" button is hidden in print via @media print, and the
 * component is also self-contained — the print button is optional.
 */
import { Download } from 'lucide-react'
import { formatPrice } from '@/data/products'
import { getPaymentStatusMeta } from '@/components/orders/orderConstants'

const STORE = {
  name: "Jamae's Craftopia",
  tagline: 'Handmade with care',
  address: 'Koramangala, Bangalore, India',
  email: 'hello@jamaes.in',
  gstin: '29ABCDE1234F1Z5', // example — wire to settings in production
}

function fmtDate(d) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })
}

export default function Invoice({ order, showPrintButton = true, hideStoreAddress = false }) {
  if (!order) return null

  function handlePrint() {
    if (typeof window !== 'undefined') window.print()
  }

  return (
    <article
      className="invoice print:p-0 print:shadow-none"
      aria-label={`Invoice for order ${order.orderNumber}`}
    >
      {/* Header */}
      <header className="flex items-start justify-between gap-4 border-b border-sand pb-5">
        <div>
          <h1 className="font-display text-2xl text-plum">{STORE.name}</h1>
          <p className="text-xs text-muted mt-0.5">{STORE.tagline}</p>
          {!hideStoreAddress && (
            <p className="text-xs text-muted mt-2 leading-relaxed">
              {STORE.address}<br />
              <a href={`mailto:${STORE.email}`} className="underline underline-offset-2">{STORE.email}</a>
            </p>
          )}
        </div>
        <div className="text-right">
          <p className="text-[0.65rem] font-semibold uppercase tracking-[0.22em] text-muted">Invoice</p>
          <p className="mt-1 font-mono text-sm font-semibold text-plum">{order.orderNumber}</p>
          <dl className="mt-2 text-xs text-muted space-y-0.5">
            <div className="flex justify-end gap-2">
              <dt>Placed</dt>
              <dd className="text-plum font-medium">{fmtDate(order.createdAt)}</dd>
            </div>
            {order.paymentReference && (
              <div className="flex justify-end gap-2">
                <dt>Ref</dt>
                <dd className="text-plum font-mono">{order.paymentReference.slice(0, 14)}…</dd>
              </div>
            )}
          </dl>
        </div>
      </header>

      {/* Bill-to / Payment */}
      <section className="mt-5 grid gap-4 sm:grid-cols-2 text-sm">
        <div>
          <p className="text-[0.65rem] font-semibold uppercase tracking-[0.18em] text-muted">Bill & ship to</p>
          {order.shippingAddress ? (
            <div className="mt-1.5 text-plum leading-relaxed">
              <p className="font-semibold">{order.shippingAddress.fullName}</p>
              <p className="text-muted text-xs">
                {[order.shippingAddress.houseFlatBuilding, order.shippingAddress.areaStreet]
                  .filter(Boolean).join(', ')}
                {order.shippingAddress.landmark ? `, ${order.shippingAddress.landmark}` : ''}
                <br />
                {order.shippingAddress.city}, {order.shippingAddress.state} — {order.shippingAddress.pinCode}
              </p>
              {order.shippingAddress.mobileNumber && (
                <p className="text-muted text-xs mt-1">+91 {order.shippingAddress.mobileNumber}</p>
              )}
              {order.shippingAddress.email && (
                <p className="text-muted text-xs">{order.shippingAddress.email}</p>
              )}
            </div>
          ) : (
            <p className="mt-1.5 text-xs text-muted">No address on file.</p>
          )}
        </div>
        <div>
          <p className="text-[0.65rem] font-semibold uppercase tracking-[0.18em] text-muted">Payment</p>
          <dl className="mt-1.5 space-y-0.5 text-xs">
            <div className="flex justify-between gap-3">
              <dt className="text-muted">Method</dt>
              <dd className="font-semibold text-plum">{order.paymentMethod || '—'}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-muted">Status</dt>
              <dd className="font-semibold text-plum">{order.paymentStatus ? getPaymentStatusMeta(order.paymentStatus).label : '—'}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-muted">Order status</dt>
              <dd className="font-semibold text-plum">{order.status}</dd>
            </div>
            {order.trackingNumber && (
              <div className="flex justify-between gap-3">
                <dt className="text-muted">Tracking</dt>
                <dd className="font-semibold text-plum font-mono">{order.trackingNumber}</dd>
              </div>
            )}
          </dl>
        </div>
      </section>

      {/* Line items */}
      <section className="mt-6">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-sand text-[0.65rem] font-semibold uppercase tracking-[0.18em] text-muted">
              <th className="text-left py-2 font-semibold">Item</th>
              <th className="text-right py-2 font-semibold w-16">Qty</th>
              <th className="text-right py-2 font-semibold w-24">Unit</th>
              <th className="text-right py-2 font-semibold w-24">Total</th>
            </tr>
          </thead>
          <tbody>
            {order.items?.map((it) => (
              <tr key={it.id || it.productId} className="border-b border-sand/60 last:border-b-0">
                <td className="py-2.5 text-plum">
                  <p className="font-semibold">{it.productName}</p>
                  {it.productId && (
                    <p className="text-[0.65rem] text-muted font-mono">SKU: {it.productId}</p>
                  )}
                </td>
                <td className="text-right py-2.5 text-plum">{it.quantity}</td>
                <td className="text-right py-2.5 text-plum">{formatPrice(it.unitPrice)}</td>
                <td className="text-right py-2.5 font-semibold text-plum">{formatPrice(it.lineTotal ?? it.unitPrice * it.quantity)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      {/* Totals */}
      <section className="mt-5 flex justify-end">
        <dl className="w-full max-w-xs space-y-1 text-sm">
          {order.subtotal != null && (
            <div className="flex justify-between gap-3">
              <dt className="text-muted">Subtotal</dt>
              <dd className="font-semibold text-plum">{formatPrice(order.subtotal)}</dd>
            </div>
          )}
          {order.discount > 0 && (
            <div className="flex justify-between gap-3">
              <dt className="text-muted">Discount</dt>
              <dd className="font-semibold text-sage">−{formatPrice(order.discount)}</dd>
            </div>
          )}
          {order.fee > 0 && (
            <div className="flex justify-between gap-3">
              <dt className="text-muted">COD fee</dt>
              <dd className="font-semibold text-plum">{formatPrice(order.fee)}</dd>
            </div>
          )}
          {order.shipping > 0 && (
            <div className="flex justify-between gap-3">
              <dt className="text-muted">Shipping</dt>
              <dd className="font-semibold text-plum">{formatPrice(order.shipping)}</dd>
            </div>
          )}
          <div className="flex justify-between gap-3 border-t border-sand pt-2 mt-1">
            <dt className="font-display text-base text-plum">Total</dt>
            <dd className="font-display text-xl text-plum">{formatPrice(order.totalAmount)}</dd>
          </div>
        </dl>
      </section>

      {/* Footer */}
      <footer className="mt-8 border-t border-sand pt-4 text-center text-xs text-muted">
        <p>Thank you for supporting handmade.</p>
        <p className="mt-1">Questions? <a href="mailto:hello@jamaes.in" className="text-bloom underline underline-offset-2">hello@jamaes.in</a></p>
      </footer>

      {/* Print button — hidden in print */}
      {showPrintButton && (
        <div className="mt-6 flex justify-end print:hidden">
          <button
            onClick={handlePrint}
            className="inline-flex items-center gap-1.5 rounded-full bg-plum px-4 py-2 text-sm font-semibold text-cream hover:bg-ink transition"
          >
            <Download className="h-4 w-4" aria-hidden="true" />
            Save as PDF / Print
          </button>
        </div>
      )}

      {/* Print styles — inline so the component is self-contained */}
      <style jsx global>{`
        @media print {
          body * { visibility: hidden; }
          .invoice, .invoice * { visibility: visible; }
          .invoice { position: absolute; left: 0; top: 0; width: 100%; padding: 24px; }
          @page { margin: 14mm; }
        }
      `}</style>
    </article>
  )
}

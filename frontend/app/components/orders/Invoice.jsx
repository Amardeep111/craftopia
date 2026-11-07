'use client'

import { Download, ExternalLink, Printer, CheckCircle2, Clock, Truck } from 'lucide-react'
import { formatPrice } from '@/data/products'
import { getPaymentStatusMeta, getStatusMeta } from '@/components/orders/orderConstants'

export const STORE_DETAILS = {
  name: "Jamae's Craftopia",
  tagline: 'Handmade crochet, floral bouquets & bespoke keepsake gifts',
  address: 'Siliguri, West Bengal, India',
  email: 'hello@jamaescraftopia.com',
  website: 'https://craftopia-store.vercel.app',
  gstin: '19ABCDE1234F1Z5',
}

function fmtDate(d) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

export function getShippingAddress(order) {
  if (!order?.shippingAddress) return null
  if (typeof order.shippingAddress === 'object') return order.shippingAddress
  try {
    return JSON.parse(order.shippingAddress)
  } catch {
    return null
  }
}

export function getOrderItems(order) {
  if (!Array.isArray(order?.items)) return []
  return order.items.map((item, idx) => {
    const productName = item.productName || item.product?.name || item.name || `Handcrafted Item #${idx + 1}`
    const unitPrice = Number(item.unitPrice ?? item.price ?? 0)
    const quantity = Number(item.quantity ?? 1)
    const lineTotal = Number(item.lineTotal ?? unitPrice * quantity)
    return {
      id: item.id || item.productId || idx,
      productName,
      productId: item.productId || item.product?.id || '',
      quantity,
      unitPrice,
      lineTotal,
    }
  })
}

/**
 * Generates an isolated, self-contained, print-perfect HTML document for A4 paper.
 */
export function generateInvoiceHtml(order) {
  if (!order) return ''
  const addr = getShippingAddress(order)
  const items = getOrderItems(order)
  const statusMeta = getStatusMeta(order.status)
  const paymentMeta = getPaymentStatusMeta(order.paymentStatus)
  const placedDate = fmtDate(order.createdAt)
  const isPaid = order.paymentStatus === 'PAID' || order.paymentStatus === 'COD_COLLECTED'

  const formattedAddressLines = addr
    ? [
        [addr.houseFlatBuilding, addr.areaStreet, addr.landmark].filter(Boolean).join(', '),
        `${[addr.city, addr.state].filter(Boolean).join(', ')}${addr.pinCode ? ` — ${addr.pinCode}` : ''}`,
        addr.country || 'India',
      ].filter(Boolean)
    : []

  const itemsRows = items
    .map(
      (it, idx) => `
      <tr style="border-bottom: 1px solid #e7dfd5;">
        <td style="padding: 10px 8px; vertical-align: top; font-size: 13px; color: #555;">${idx + 1}</td>
        <td style="padding: 10px 8px; vertical-align: top;">
          <strong style="color: #3b1d28; font-size: 13px; display: block;">${it.productName}</strong>
          ${it.productId ? `<span style="font-size: 10px; color: #888; font-family: monospace;">SKU: ${it.productId}</span>` : ''}
        </td>
        <td style="padding: 10px 8px; vertical-align: top; text-align: center; font-size: 13px; color: #3b1d28;">${it.quantity}</td>
        <td style="padding: 10px 8px; vertical-align: top; text-align: right; font-size: 13px; color: #3b1d28;">₹${it.unitPrice.toLocaleString('en-IN')}</td>
        <td style="padding: 10px 8px; vertical-align: top; text-align: right; font-size: 13px; font-weight: 600; color: #3b1d28;">₹${it.lineTotal.toLocaleString('en-IN')}</td>
      </tr>
    `
    )
    .join('')

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>Invoice - ${order.orderNumber} - ${STORE_DETAILS.name}</title>
  <style>
    @page {
      size: A4;
      margin: 12mm 15mm;
    }
    * {
      box-sizing: border-box;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    body {
      margin: 0;
      padding: 24px;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      color: #2b1d22;
      background: #ffffff;
      font-size: 13px;
      line-height: 1.5;
    }
    .invoice-wrapper {
      max-width: 800px;
      margin: 0 auto;
    }
    .header-table {
      width: 100%;
      border-bottom: 2px solid #5f2d4b;
      padding-bottom: 16px;
      margin-bottom: 20px;
    }
    .brand-title {
      font-size: 26px;
      font-weight: 700;
      color: #5f2d4b;
      margin: 0 0 4px 0;
      font-family: "Georgia", serif;
      letter-spacing: -0.5px;
    }
    .badge {
      display: inline-block;
      padding: 4px 10px;
      font-size: 11px;
      font-weight: 700;
      border-radius: 9999px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .badge-paid { background: #e8f5e9; color: #2e7d32; border: 1px solid #c8e6c9; }
    .badge-pending { background: #fff8e1; color: #f57f17; border: 1px solid #ffe082; }
    .badge-cod { background: #ede7f6; color: #512da8; border: 1px solid #d1c4e9; }
    .info-card {
      background: #faf7f2;
      border: 1px solid #e7dfd5;
      border-radius: 8px;
      padding: 12px 14px;
    }
    table.data-table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 14px;
    }
    table.data-table th {
      background: #f4eee6;
      color: #5f2d4b;
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: 0.8px;
      padding: 8px;
      text-align: left;
      border-bottom: 1px solid #d8cdbe;
    }
    .total-box {
      float: right;
      width: 280px;
      margin-top: 14px;
      background: #faf7f2;
      border: 1px solid #e7dfd5;
      border-radius: 8px;
      padding: 12px 14px;
    }
    .total-row {
      display: flex;
      justify-content: space-between;
      padding: 4px 0;
      font-size: 12px;
      color: #666;
    }
    .grand-total {
      display: flex;
      justify-content: space-between;
      border-top: 1.5px solid #5f2d4b;
      padding-top: 8px;
      margin-top: 6px;
      font-size: 16px;
      font-weight: 700;
      color: #5f2d4b;
    }
    .footer-note {
      clear: both;
      margin-top: 40px;
      padding-top: 16px;
      border-top: 1px dashed #d8cdbe;
      text-align: center;
      font-size: 11px;
      color: #777;
    }
  </style>
</head>
<body>
  <div class="invoice-wrapper">
    <table class="header-table">
      <tr>
        <td style="vertical-align: top;">
          <h1 class="brand-title">${STORE_DETAILS.name}</h1>
          <p style="margin: 0; font-size: 12px; color: #666;">${STORE_DETAILS.tagline}</p>
          <p style="margin: 4px 0 0 0; font-size: 11px; color: #777;">
            ${STORE_DETAILS.address}<br />
            Email: ${STORE_DETAILS.email} &bull; Web: ${STORE_DETAILS.website}
          </p>
        </td>
        <td style="vertical-align: top; text-align: right;">
          <div style="font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 1.5px; color: #b75e7a;">Retail Tax Invoice</div>
          <div style="font-size: 18px; font-weight: 700; font-family: monospace; color: #3b1d28; margin-top: 2px;">INV-${order.orderNumber}</div>
          <p style="margin: 4px 0 0 0; font-size: 11px; color: #666;">
            <strong>Order Date:</strong> ${placedDate}<br />
            <strong>Order ID:</strong> #${order.orderNumber}
          </p>
          <div style="margin-top: 6px;">
            <span class="badge ${isPaid ? 'badge-paid' : order.paymentMethod?.toLowerCase().includes('cod') ? 'badge-cod' : 'badge-pending'}">
              ${isPaid ? '✓ Paid' : paymentMeta.label || 'Payment Pending'}
            </span>
          </div>
        </td>
      </tr>
    </table>

    <table style="width: 100%; border-collapse: separate; border-spacing: 10px 0; margin: 0 -10px 16px -10px;">
      <tr>
        <td style="width: 50%; vertical-align: top;">
          <div class="info-card">
            <div style="font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.8px; color: #b75e7a; margin-bottom: 6px;">Billed To</div>
            <strong style="color: #3b1d28; font-size: 14px;">${order.customerName || addr?.fullName || 'Customer'}</strong>
            <div style="font-size: 12px; color: #555; margin-top: 3px;">
              ${order.customerEmail || addr?.email ? `<div>Email: ${order.customerEmail || addr?.email}</div>` : ''}
              ${order.customerPhone || addr?.mobileNumber ? `<div>Phone: +91 ${order.customerPhone || addr?.mobileNumber}</div>` : ''}
            </div>
          </div>
        </td>
        <td style="width: 50%; vertical-align: top;">
          <div class="info-card">
            <div style="font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.8px; color: #b75e7a; margin-bottom: 6px;">Shipped To</div>
            <strong style="color: #3b1d28; font-size: 14px;">${addr?.fullName || order.customerName || 'Customer'}</strong>
            <div style="font-size: 12px; color: #555; margin-top: 3px; line-height: 1.4;">
              ${formattedAddressLines.length > 0 ? formattedAddressLines.join('<br />') : 'Standard Shipping'}
              ${addr?.mobileNumber ? `<div style="margin-top: 3px;">Contact: +91 ${addr.mobileNumber}</div>` : ''}
            </div>
          </div>
        </td>
      </tr>
    </table>

    <table style="width: 100%; border-collapse: collapse; margin-bottom: 16px; font-size: 11px; background: #faf7f2; border: 1px solid #e7dfd5; border-radius: 6px;">
      <tr>
        <td style="padding: 8px 12px;"><strong>Payment Method:</strong> ${order.paymentMethod || 'UPI'}</td>
        <td style="padding: 8px 12px;"><strong>Payment Status:</strong> ${paymentMeta.label}</td>
        <td style="padding: 8px 12px;"><strong>Fulfillment:</strong> ${statusMeta.label}</td>
        ${order.paymentReference ? `<td style="padding: 8px 12px;"><strong>UTR / Ref:</strong> <span style="font-family: monospace;">${order.paymentReference}</span></td>` : ''}
      </tr>
    </table>

    <table class="data-table">
      <thead>
        <tr>
          <th style="width: 30px;">#</th>
          <th>Item & Description</th>
          <th style="text-align: center; width: 60px;">Qty</th>
          <th style="text-align: right; width: 90px;">Price</th>
          <th style="text-align: right; width: 100px;">Total</th>
        </tr>
      </thead>
      <tbody>
        ${itemsRows}
      </tbody>
    </table>

    <div class="total-box">
      <div class="total-row">
        <span>Subtotal</span>
        <span>₹${(order.subtotal ?? (order.totalAmount + (order.discount || 0) - (order.shipping || 0) - (order.fee || 0))).toLocaleString('en-IN')}</span>
      </div>
      ${order.discount > 0 ? `
      <div class="total-row" style="color: #2e7d32;">
        <span>Discount ${order.couponCode ? `(${order.couponCode})` : ''}</span>
        <span>−₹${order.discount.toLocaleString('en-IN')}</span>
      </div>` : ''}
      <div class="total-row">
        <span>Shipping</span>
        <span>${order.shipping > 0 ? `₹${order.shipping.toLocaleString('en-IN')}` : 'FREE'}</span>
      </div>
      ${order.fee > 0 ? `
      <div class="total-row">
        <span>COD / Convenience Fee</span>
        <span>₹${order.fee.toLocaleString('en-IN')}</span>
      </div>` : ''}
      <div class="grand-total">
        <span>Total Payable</span>
        <span>₹${order.totalAmount.toLocaleString('en-IN')}</span>
      </div>
    </div>

    <div style="clear: both; padding-top: 16px;"></div>

    <div class="footer-note">
      <p style="margin: 0; font-weight: 600; color: #5f2d4b;">Thank you for shopping at Jamae's Craftopia!</p>
      <p style="margin: 4px 0 0 0;">Each piece is handmade with heart and patience. For care tips, customization, or queries, reach us at ${STORE_DETAILS.email}.</p>
      <p style="margin: 4px 0 0 0; font-size: 10px; color: #999;">This is a computer-generated tax invoice and requires no physical signature.</p>
    </div>
  </div>
</body>
</html>`
}

/**
 * Triggers a clean print dialog of the standalone invoice without website chrome.
 */
export function printInvoice(order) {
  if (typeof window === 'undefined' || !order) return
  const html = generateInvoiceHtml(order)
  const iframe = document.createElement('iframe')
  iframe.style.position = 'fixed'
  iframe.style.right = '0'
  iframe.style.bottom = '0'
  iframe.style.width = '0'
  iframe.style.height = '0'
  iframe.style.border = '0'
  iframe.style.opacity = '0'
  document.body.appendChild(iframe)

  const doc = iframe.contentWindow.document
  doc.open()
  doc.write(html)
  doc.close()

  iframe.contentWindow.focus()
  setTimeout(() => {
    try {
      iframe.contentWindow.print()
    } catch {
      window.print()
    }
    setTimeout(() => {
      try {
        document.body.removeChild(iframe)
      } catch {}
    }, 3000)
  }, 300)
}

/**
 * Rich on-screen Invoice Component suitable for modals and full-page previews.
 */
export default function Invoice({ order, showActions = true, onDownload }) {
  if (!order) return null

  const addr = getShippingAddress(order)
  const items = getOrderItems(order)
  const statusMeta = getStatusMeta(order.status)
  const paymentMeta = getPaymentStatusMeta(order.paymentStatus)
  const isPaid = order.paymentStatus === 'PAID' || order.paymentStatus === 'COD_COLLECTED'

  function handleDownloadClick() {
    if (typeof onDownload === 'function') {
      onDownload()
    } else {
      printInvoice(order)
    }
  }

  return (
    <article
      className="invoice-card mx-auto max-w-3xl rounded-3xl border border-sand bg-white p-6 sm:p-10 shadow-lift text-plum print:border-none print:shadow-none print:p-0"
      aria-label={`Invoice for order ${order.orderNumber}`}
    >
      {/* Top Action Bar (hidden when printing) */}
      {showActions && (
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3 border-b border-sand pb-4 print:hidden">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-muted">Invoice Preview</span>
            <span className="rounded-full bg-sand/40 px-2.5 py-0.5 font-mono text-xs font-semibold text-plum">
              #{order.orderNumber}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleDownloadClick}
              className="inline-flex items-center gap-1.5 rounded-full bg-plum px-4 py-2 text-xs font-semibold text-cream shadow-soft transition hover:bg-ink hover:-translate-y-0.5 hover:shadow-lift active:translate-y-0"
            >
              <Printer className="h-3.5 w-3.5" aria-hidden="true" />
              Print / Save as PDF
            </button>
          </div>
        </div>
      )}

      {/* Brand Header */}
      <header className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between border-b border-sand pb-6">
        <div>
          <div className="flex items-center gap-2">
            <span className="h-3 w-3 rounded-full bg-bloom" />
            <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-plum">
              {STORE_DETAILS.name}
            </h1>
          </div>
          <p className="mt-1 text-xs text-muted leading-relaxed max-w-sm">
            {STORE_DETAILS.tagline}
          </p>
          <p className="mt-2 text-xs text-muted">
            {STORE_DETAILS.address} &bull; <a href={`mailto:${STORE_DETAILS.email}`} className="text-bloom underline underline-offset-2">{STORE_DETAILS.email}</a>
          </p>
        </div>

        <div className="sm:text-right">
          <span className="inline-block rounded-full bg-bloom/10 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-bloom">
            Retail Tax Invoice
          </span>
          <p className="mt-2 font-mono text-base font-bold text-plum">INV-{order.orderNumber}</p>
          <dl className="mt-1 text-xs text-muted space-y-0.5">
            <div className="flex sm:justify-end gap-2">
              <dt>Date:</dt>
              <dd className="font-medium text-plum">{fmtDate(order.createdAt)}</dd>
            </div>
            <div className="flex sm:justify-end gap-2">
              <dt>Status:</dt>
              <dd className="font-semibold text-bloom">{statusMeta.label}</dd>
            </div>
          </dl>
        </div>
      </header>

      {/* Bill To & Ship To Cards */}
      <section className="mt-6 grid gap-4 sm:grid-cols-2">
        <div className="rounded-2xl border border-sand/70 bg-ivory/50 p-4">
          <p className="text-[11px] font-bold uppercase tracking-wider text-bloom">Billed To</p>
          <p className="mt-1 font-semibold text-plum">{order.customerName || addr?.fullName || 'Customer'}</p>
          {(order.customerEmail || addr?.email) && (
            <p className="text-xs text-muted mt-0.5">{order.customerEmail || addr?.email}</p>
          )}
          {(order.customerPhone || addr?.mobileNumber) && (
            <p className="text-xs text-muted mt-0.5">+91 {order.customerPhone || addr?.mobileNumber}</p>
          )}
        </div>

        <div className="rounded-2xl border border-sand/70 bg-ivory/50 p-4">
          <p className="text-[11px] font-bold uppercase tracking-wider text-bloom">Shipped To</p>
          {addr ? (
            <div className="mt-1 text-xs leading-relaxed text-plum">
              <p className="font-semibold">{addr.fullName}</p>
              <p className="text-muted mt-0.5">
                {[addr.houseFlatBuilding, addr.areaStreet, addr.landmark].filter(Boolean).join(', ')}
                <br />
                {[addr.city, addr.state].filter(Boolean).join(', ')}{addr.pinCode ? ` — ${addr.pinCode}` : ''}
              </p>
              {addr.mobileNumber && <p className="text-muted mt-1">+91 {addr.mobileNumber}</p>}
            </div>
          ) : (
            <p className="mt-1 text-xs text-muted">Delivery address on file.</p>
          )}
        </div>
      </section>

      {/* Payment & Fulfillment Summary Pill */}
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-cream px-4 py-3 text-xs">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-muted">Payment:</span>
          <span className="font-semibold text-plum">{order.paymentMethod || 'UPI'}</span>
          <span className={['rounded-full px-2.5 py-0.5 font-bold', isPaid ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-900'].join(' ')}>
            {isPaid ? '✓ Paid' : paymentMeta.label}
          </span>
        </div>
        {order.paymentReference && (
          <div className="flex items-center gap-1.5 font-mono text-muted text-[11px]">
            <span>Ref:</span>
            <span className="text-plum font-semibold">{order.paymentReference}</span>
          </div>
        )}
      </div>

      {/* Items Table */}
      <section className="mt-6 overflow-x-auto">
        <table className="w-full text-left text-xs sm:text-sm">
          <thead>
            <tr className="border-b border-sand text-[11px] font-bold uppercase tracking-wider text-muted">
              <th className="py-2.5 pl-1">Item</th>
              <th className="py-2.5 text-center w-16">Qty</th>
              <th className="py-2.5 text-right w-24">Unit Price</th>
              <th className="py-2.5 text-right pr-1 w-28">Total</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-sand/50">
            {items.map((it) => (
              <tr key={it.id}>
                <td className="py-3 pl-1 text-plum">
                  <p className="font-semibold">{it.productName}</p>
                  {it.productId && (
                    <p className="text-[10px] font-mono text-muted">SKU: {it.productId}</p>
                  )}
                </td>
                <td className="py-3 text-center text-plum font-medium">{it.quantity}</td>
                <td className="py-3 text-right text-plum">{formatPrice(it.unitPrice)}</td>
                <td className="py-3 text-right pr-1 font-semibold text-plum">{formatPrice(it.lineTotal)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      {/* Totals Summary */}
      <section className="mt-6 flex justify-end">
        <dl className="w-full max-w-xs space-y-1.5 rounded-2xl border border-sand/70 bg-ivory/40 p-4 text-xs sm:text-sm">
          <div className="flex justify-between gap-3 text-muted">
            <dt>Subtotal</dt>
            <dd className="font-semibold text-plum">
              {formatPrice(order.subtotal ?? (order.totalAmount + (order.discount || 0) - (order.shipping || 0) - (order.fee || 0)))}
            </dd>
          </div>
          {order.discount > 0 && (
            <div className="flex justify-between gap-3 text-emerald-800">
              <dt>Discount {order.couponCode ? `(${order.couponCode})` : ''}</dt>
              <dd className="font-semibold">−{formatPrice(order.discount)}</dd>
            </div>
          )}
          <div className="flex justify-between gap-3 text-muted">
            <dt>Shipping</dt>
            <dd className="font-semibold text-plum">
              {order.shipping > 0 ? formatPrice(order.shipping) : 'FREE'}
            </dd>
          </div>
          {order.fee > 0 && (
            <div className="flex justify-between gap-3 text-muted">
              <dt>COD Fee</dt>
              <dd className="font-semibold text-plum">{formatPrice(order.fee)}</dd>
            </div>
          )}
          <div className="flex justify-between gap-3 border-t border-sand pt-2 font-display text-base font-bold text-plum">
            <dt>Total Amount</dt>
            <dd className="text-bloom text-lg">{formatPrice(order.totalAmount)}</dd>
          </div>
        </dl>
      </section>

      {/* Footer */}
      <footer className="mt-10 border-t border-sand pt-5 text-center text-xs text-muted">
        <p className="font-semibold text-plum">Thank you for supporting handcrafted artistry!</p>
        <p className="mt-1">
          For any questions or custom requests, email us at <a href={`mailto:${STORE_DETAILS.email}`} className="text-bloom underline underline-offset-2">{STORE_DETAILS.email}</a>.
        </p>
        <p className="mt-2 text-[10px] text-muted/70">
          This is an official computer-generated receipt from Jamae's Craftopia.
        </p>
      </footer>
    </article>
  )
}

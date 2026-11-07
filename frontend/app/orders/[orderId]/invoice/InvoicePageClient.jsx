'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import { ArrowLeft, Printer } from 'lucide-react'
import Invoice, { printInvoice } from '@/components/orders/Invoice'

export default function InvoicePageClient({ order, orderId }) {
  useEffect(() => {
    if (typeof window !== 'undefined' && window.location.search.includes('print=1')) {
      const timer = setTimeout(() => {
        printInvoice(order)
      }, 300)
      return () => clearTimeout(timer)
    }
  }, [order])

  if (!order) {
    return (
      <main className="container-page py-20 text-center">
        <div className="mx-auto max-w-md rounded-3xl bg-ivory/60 p-10">
          <h1 className="font-display text-2xl text-plum">Invoice not available</h1>
          <p className="mt-2 text-sm text-muted">We could not load this order invoice. It may have expired or been moved.</p>
          <Link
            href="/orders/me"
            className="mt-6 inline-flex rounded-full bg-plum px-5 py-2.5 text-sm font-semibold text-cream"
          >
            Go to My Orders
          </Link>
        </div>
      </main>
    )
  }

  return (
    <div className="container-page py-8 print:p-0">
      {/* Top navigation — hidden in print */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3 print:hidden">
        <Link
          href={`/orders/${order.id || orderId}`}
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-muted hover:text-plum transition"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to order details
        </Link>
        <button
          type="button"
          onClick={() => printInvoice(order)}
          className="inline-flex items-center gap-2 rounded-full bg-plum px-5 py-2.5 text-sm font-semibold text-cream shadow-soft transition hover:bg-ink hover:-translate-y-0.5 hover:shadow-lift active:translate-y-0"
        >
          <Printer className="h-4 w-4" aria-hidden="true" />
          Download PDF / Print
        </button>
      </div>

      {/* Official Invoice Card */}
      <Invoice order={order} showActions={false} onDownload={() => printInvoice(order)} />
    </div>
  )
}

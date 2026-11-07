import InvoicePageClient from './InvoicePageClient'

export const dynamic = 'force-dynamic'

export async function generateMetadata({ params }) {
  const { orderId } = await params
  return {
    title: `Tax Invoice - #${orderId} | Jamae's Craftopia`,
    description: `Download or print official retail invoice for order #${orderId}.`,
  }
}

const BACKEND_URL = (
  process.env.GO_BACKEND_URL ||
  process.env.NEXT_PUBLIC_API_URL ||
  (process.env.NODE_ENV === 'production' ? 'https://craftopia-backend.vercel.app' : 'http://localhost:8080')
).replace(/\/$/, '')

async function getOrder(orderId) {
  try {
    const res = await fetch(`${BACKEND_URL}/api/orders/${encodeURIComponent(orderId)}`, { cache: 'no-store' })
    if (!res.ok) return null
    const json = await res.json()
    return json?.data || null
  } catch (err) {
    console.error('SSR: Error pre-fetching invoice order:', err)
    return null
  }
}

export default async function OrderInvoicePage({ params }) {
  const { orderId } = await params
  const order = await getOrder(orderId)

  return <InvoicePageClient order={order} orderId={orderId} />
}

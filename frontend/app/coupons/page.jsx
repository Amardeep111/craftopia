import PageHeader from '@/components/layout/PageHeader'
import CouponList from '@/components/coupon/CouponList'

export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'Coupons | Jamae\'s Craftopia',
  description: 'Available coupons and discounts you can apply at checkout.',
}

const BACKEND_URL = (process.env.GO_BACKEND_URL || process.env.NEXT_PUBLIC_API_URL || (process.env.NODE_ENV === 'production' ? 'https://craftopia-backend.vercel.app' : 'http://localhost:8080')).replace(/\/$/, '')

async function getCoupons() {
  try {
    const res = await fetch(`${BACKEND_URL}/api/coupons`, { cache: 'no-store' })
    if (!res.ok) return { available: [], used: [], exhausted: [] }
    const json = await res.json()
    return {
      available: Array.isArray(json?.data) ? json.data : [],
      used: Array.isArray(json?.used) ? json.used : [],
      exhausted: Array.isArray(json?.exhausted) ? json.exhausted : [],
    }
  } catch (err) {
    console.error('SSR: Error pre-fetching coupons:', err)
    return { available: [], used: [], exhausted: [] }
  }
}

export default async function CouponsPage() {
  const coupons = await getCoupons()

  return (
    <>
      <PageHeader
        eyebrow="Offers & discounts"
        title="Coupons you can use right now."
        description="Grab a code below and apply it in your cart or at checkout. Minimum cart values apply."
      />
      <CouponList initialCoupons={coupons} />
    </>
  )
}

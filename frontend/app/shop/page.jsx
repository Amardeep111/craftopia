import { Suspense } from 'react'
import ShopClient from './ShopClient'

export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'Shop | Jamae\'s Craftopia',
  description: 'Handmade crochet and artisanal creations from our Siliguri workshop.',
}

const BACKEND_URL = (process.env.GO_BACKEND_URL || process.env.NEXT_PUBLIC_API_URL || (process.env.NODE_ENV === 'production' ? 'https://craftopia-backend.vercel.app' : 'http://localhost:8080')).replace(/\/$/, '')

async function getInitialProducts(category = 'all') {
  try {
    const params = new URLSearchParams()
    params.set('limit', '12')
    params.set('skip', '0')
    if (category && category !== 'all') params.set('category', category)
    const res = await fetch(`${BACKEND_URL}/api/products?${params.toString()}`, { cache: 'no-store' })
    if (!res.ok) return []
    const json = await res.json()
    return Array.isArray(json?.data) ? json.data : []
  } catch (err) {
    console.error('SSR: Error pre-fetching shop products:', err)
    return []
  }
}

async function getCategories() {
  try {
    const res = await fetch(`${BACKEND_URL}/api/categories`, { cache: 'no-store' })
    if (!res.ok) return []
    const json = await res.json()
    return Array.isArray(json?.data) ? json.data : []
  } catch (err) {
    console.error('SSR: Error pre-fetching shop categories:', err)
    return []
  }
}

export default async function ShopPage({ searchParams }) {
  const sp = await searchParams
  const category = sp?.category || 'all'

  const [products, categories] = await Promise.all([
    getInitialProducts(category),
    getCategories(),
  ])

  return (
    <Suspense fallback={<div className="container-page py-20 text-center text-muted">Opening the workshop doors…</div>}>
      <ShopClient
        initialProducts={products}
        initialCategories={categories}
        initialCategory={category}
      />
    </Suspense>
  )
}

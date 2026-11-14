import { Suspense } from 'react'
import ShopClient from './ShopClient'
import PageHeader from '@/components/layout/PageHeader'
import LoadingCollection from './loading'

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

async function ShopContent({ productsPromise, categoriesPromise, category }) {
  // Category labels must not hold back the actual product grid.
  const products = await productsPromise
  return <ShopClient initialProducts={products} categoriesPromise={categoriesPromise} initialCategory={category} />
}
export default async function ShopPage({ searchParams }) {
  const sp = await searchParams
  const category = sp?.category || 'all'
  const productsPromise = getInitialProducts(category)
  const categoriesPromise = getCategories()
  return <>
    <PageHeader eyebrow="The collection" title="Shop handmade pieces" description="Browse toys, flowers, accessories, and custom-ready keepsakes. Filter by what you are in the mood for." />
    <Suspense fallback={<LoadingCollection showHeader={false} />}>
      <ShopContent productsPromise={productsPromise} categoriesPromise={categoriesPromise} category={category} />
    </Suspense>
  </>
}

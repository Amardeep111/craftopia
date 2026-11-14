'use client'

import { Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import ShopClient, { getCompletedCatalog } from './ShopClient'
import PageHeader from '@/components/layout/PageHeader'

function OpeningCollection({ showHeader }) {
  const category = useSearchParams().get('category') || 'all'
  const completed = getCompletedCatalog(category)
  return <>
    {showHeader && <PageHeader eyebrow="The collection" title="Shop handmade pieces" description="Browse toys, flowers, accessories, and custom-ready keepsakes. Filter by what you are in the mood for." />}
    {completed ? <ShopClient initialProducts={completed.products} initialCategories={completed.categories} initialCategory={category} /> : <p className="container-page pb-16 text-sm text-muted" role="status">Loading the latest handmade pieces…</p>}
  </>
}

export default function LoadingCollection({ showHeader = true }) {
  return <Suspense fallback={null}><OpeningCollection showHeader={showHeader} /></Suspense>
}

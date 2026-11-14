'use client'

import { usePathname } from 'next/navigation'
import { getCompletedHomeView } from './components/home/CompletedHomeView'
import SkeletonCard from './components/ui/SkeletonCard'

export default function Loading() {
  const pathname = usePathname()
  const home = pathname === '/' ? getCompletedHomeView() : null
  if (home) return <div data-cached-home-view>{home}</div>
  return <section className="container-page py-10 sm:py-14" role="status" aria-label="Loading page" aria-busy="true">
    <span className="sr-only">Opening the next page…</span>
    <div aria-hidden="true">
      <div className="h-10 w-3/4 max-w-sm rounded bg-sand/40" />
      <div className="mt-4 h-4 w-full max-w-md rounded bg-sand/25" />
      <div className="studio-product-grid mt-10">{Array.from({ length: 4 }, (_, i) => <SkeletonCard key={i} />)}</div>
    </div>
  </section>
}

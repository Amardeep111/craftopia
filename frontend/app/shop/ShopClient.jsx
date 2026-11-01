'use client'

import { useEffect, useMemo, useRef, useState, useCallback } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Search } from 'lucide-react'
import PageHeader from '@/components/layout/PageHeader'
import EmptyState from '@/components/ui/EmptyState'
import ProductCard from '@/components/ui/ProductCard'
import Select from '@/components/ui/Select'
import SkeletonCard from '@/components/ui/SkeletonCard'
import { shopCategories } from '@/data/categories'
import { useInView } from '@/hooks/useInView'
import { cn } from '@/lib/cn'

const PAGE_SIZE = 12

const sortOptions = [
  { value: 'featured', label: 'Featured' },
  { value: 'name', label: 'Name' },
  { value: 'price-asc', label: 'Price: low to high' },
  { value: 'price-desc', label: 'Price: high to low' },
]

export default function ShopClient({ initialProducts = [], initialCategories = [], initialCategory = 'all' }) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const categoryParam = searchParams.get('category') || initialCategory || 'all'
  const [selectedCategory, setSelectedCategory] = useState(categoryParam)
  const [query, setQuery] = useState('')
  const [sort, setSort] = useState('featured')

  // Initial SSR state: pre-populated from server! Zero skeleton on first load.
  const hasSSRData = Array.isArray(initialProducts) && initialProducts.length > 0 && selectedCategory === initialCategory
  const [catalog, setCatalog] = useState(() => (hasSSRData ? initialProducts : []))
  const [categories, setCategories] = useState(() => (Array.isArray(initialCategories) && initialCategories.length > 0 ? initialCategories : shopCategories))
  const [loadingInitial, setLoadingInitial] = useState(() => !hasSSRData)
  const [loadingMore, setLoadingMore] = useState(false)
  const [hasMore, setHasMore] = useState(true)
  const [error, setError] = useState(null)

  // Infinite scroll sentinel
  const [sentinelRef, sentinelInView] = useInView({ rootMargin: '450px', once: false })
  const fetchingRef = useRef(false)
  const firstRenderRef = useRef(true)

  // Keep selectedCategory in sync if searchParams changes from browser back/forward
  useEffect(() => {
    setSelectedCategory(categoryParam)
  }, [categoryParam])

  // Fetch new batch when user switches category
  useEffect(() => {
    if (firstRenderRef.current) {
      firstRenderRef.current = false
      if (hasSSRData) return
    }

    let active = true
    setLoadingInitial(true)
    setCatalog([])
    fetchingRef.current = true
    setError(null)

    const params = new URLSearchParams()
    params.set('limit', String(PAGE_SIZE))
    params.set('skip', '0')
    if (selectedCategory !== 'all') params.set('category', selectedCategory)

    fetch(`/api/products?${params.toString()}`, { cache: 'no-store' })
      .then((r) => r.json())
      .then((result) => {
        if (!active) return
        if (result?.success && Array.isArray(result.data)) {
          setCatalog(result.data)
          setHasMore(Boolean(result.hasMore ?? result.data.length >= PAGE_SIZE))
        }
      })
      .catch(() => {
        if (active) setError('Could not refresh products.')
      })
      .finally(() => {
        if (active) {
          setLoadingInitial(false)
          fetchingRef.current = false
        }
      })

    return () => { active = false }
  }, [selectedCategory, hasSSRData])

  // Load more on scroll when approaching bottom
  const loadMore = useCallback(() => {
    if (fetchingRef.current || !hasMore || loadingMore || loadingInitial) return
    fetchingRef.current = true
    setLoadingMore(true)

    const params = new URLSearchParams()
    params.set('limit', String(PAGE_SIZE))
    params.set('skip', String(catalog.length))
    if (selectedCategory !== 'all') params.set('category', selectedCategory)

    fetch(`/api/products?${params.toString()}`, { cache: 'no-store' })
      .then((r) => r.json())
      .then((result) => {
        if (result?.success && Array.isArray(result.data)) {
          if (result.data.length === 0) {
            setHasMore(false)
          } else {
            setCatalog((prev) => {
              const existingIds = new Set(prev.map((p) => p.id))
              const fresh = result.data.filter((p) => !existingIds.has(p.id))
              return [...prev, ...fresh]
            })
            setHasMore(Boolean(result.hasMore ?? result.data.length >= PAGE_SIZE))
          }
        } else {
          setHasMore(false)
        }
      })
      .catch(() => {
        setHasMore(false)
      })
      .finally(() => {
        setLoadingMore(false)
        fetchingRef.current = false
      })
  }, [hasMore, loadingMore, loadingInitial, catalog.length, selectedCategory])

  useEffect(() => {
    if (sentinelInView && hasMore && !loadingMore && !fetchingRef.current) {
      loadMore()
    }
  }, [sentinelInView, hasMore, loadingMore, loadMore])

  const setCategory = (slug) => {
    if (slug === selectedCategory) return
    setSelectedCategory(slug)
    setLoadingInitial(true)
    setCatalog([])
    const params = new URLSearchParams(searchParams.toString())
    if (slug === 'all') params.delete('category')
    else params.set('category', slug)
    const newQuery = params.toString()
    router.push(newQuery ? `/shop?${newQuery}` : '/shop', { scroll: false })
  }

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    let list = catalog
    if (q) {
      list = list.filter(
        (p) =>
          p.name?.toLowerCase().includes(q) ||
          p.short?.toLowerCase().includes(q) ||
          p.description?.toLowerCase().includes(q),
      )
    }
    if (sort === 'name') list = [...list].sort((a, b) => a.name.localeCompare(b.name))
    if (sort === 'price-asc') list = [...list].sort((a, b) => a.price - b.price)
    if (sort === 'price-desc') list = [...list].sort((a, b) => b.price - a.price)
    if (sort === 'featured') list = [...list].sort((a, b) => Number(b.featured) - Number(a.featured))
    return list
  }, [catalog, query, sort])

  return (
    <>
      <PageHeader
        eyebrow="The collection"
        title="Shop handmade pieces"
        description="Browse toys, flowers, accessories, and custom-ready keepsakes. Filter by what you are in the mood for."
      />
      <div className="container-page pb-16">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <label className="relative block w-full max-w-md">
            <span className="sr-only">Search creations</span>
            <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search bears, roses, initials…"
              className="w-full rounded-full border border-sand bg-ivory py-3 pl-11 pr-4 text-sm text-ink outline-none ring-bloom/30 transition focus:ring-2"
            />
          </label>
          <label className="flex items-center gap-3 text-sm text-muted">
            Sort
            <Select
              value={sort}
              onChange={setSort}
              options={sortOptions}
              className="w-48"
            />
          </label>
        </div>

        <div className="relative z-10 mt-2 pt-4 flex gap-2 overflow-x-auto pb-2" role="tablist" aria-label="Categories">
          <button
            type="button"
            role="tab"
            aria-selected={selectedCategory === 'all'}
            onClick={() => setCategory('all')}
            className={cn(
              'relative z-10 shrink-0 rounded-full px-4 py-2 text-sm font-semibold transition',
              selectedCategory === 'all' ? 'bg-plum text-cream' : 'bg-ivory text-plum ring-1 ring-sand hover:bg-blush/50',
            )}
          >
            All
          </button>
          {(Array.isArray(categories) ? categories : []).map((cat) => (
            <button
              key={cat.id}
              type="button"
              role="tab"
              aria-selected={selectedCategory === cat.slug}
              onClick={() => setCategory(cat.slug)}
              className={cn(
                'relative z-10 shrink-0 rounded-full px-4 py-2 text-sm font-semibold transition',
                selectedCategory === cat.slug ? 'bg-plum text-cream' : 'bg-ivory text-plum ring-1 ring-sand hover:bg-blush/50',
              )}
            >
              {cat.name}
            </button>
          ))}
        </div>

        {loadingInitial ? (
          <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
        ) : error ? (
          <div className="mt-12 text-center">
            <h2 className="font-display text-2xl text-plum">Shelf is loading</h2>
            <p className="mt-2 text-muted">{error}</p>
            <button
              onClick={() => window.location.reload()}
              className="mt-4 rounded-full bg-plum px-6 py-2 text-sm font-semibold text-cream"
            >
              Refresh
            </button>
          </div>
        ) : filtered.length === 0 ? (
          <div className="mt-12">
            <EmptyState
              title="Nothing on this shelf just now"
              description="Try another category, or browse everything we make."
              actionLabel="Show everything"
              onAction={() => setCategory('all')}
            />
          </div>
        ) : (
          <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        )}

        {/* Infinite scroll load more indicator */}
        <div ref={sentinelRef} className="py-8 text-center">
          {loadingMore && (
            <div className="inline-flex items-center gap-2 text-sm text-muted">
              <span className="h-2 w-2 rounded-full bg-bloom animate-ping" />
              Fetching more lovely pieces…
            </div>
          )}
        </div>
      </div>
    </>
  )
}


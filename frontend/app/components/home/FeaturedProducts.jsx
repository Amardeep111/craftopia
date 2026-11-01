'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useInView } from '@/hooks/useInView'
import { api } from '@/lib/api/client'
import Button from '../ui/Button'
import ProductCard from '../ui/ProductCard'
import ScrollReveal from '../ui/ScrollReveal'
import SectionHeading from '../ui/SectionHeading'
import SkeletonCard from '../ui/SkeletonCard'

export default function FeaturedProducts({ initialProducts }) {
  const hasInitial = Array.isArray(initialProducts) && initialProducts.length > 0
  const [featured, setFeatured] = useState(() => (hasInitial ? initialProducts : []))
  const [loading, setLoading] = useState(() => !hasInitial)
  const [containerRef, inView] = useInView({ rootMargin: '350px' })

  useEffect(() => {
    // If SSR already pre-loaded featured products, skip client fetch
    if (!inView || hasInitial) return
    let active = true
    api.products.list({ featured: true, limit: 8 })
      .then((data) => {
        if (active && Array.isArray(data) && data.length > 0) {
          setFeatured(data)
        }
      })
      .catch(() => {})
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => { active = false }
  }, [inView, hasInitial])

  return (
    <section ref={containerRef} className="container-page mt-20 sm:mt-28">
      <SectionHeading
        eyebrow="On the table right now"
        title="Featured creations"
        description="A handful of pieces we love — each one handmade, each one a little different from the last."
      />
      <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {Array.isArray(featured) && featured.length > 0 ? (
          featured.map((product, i) => (
            <ScrollReveal key={product.id} delay={i * 0.04}>
              <ProductCard product={product} />
            </ScrollReveal>
          ))
        ) : loading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <SkeletonCard key={i} />
          ))
        ) : null}
      </div>
      <div className="mt-10 text-center">
        <Button as={Link} href="/shop" variant="secondary">
          See the full collection
        </Button>
      </div>
    </section>
  )
}

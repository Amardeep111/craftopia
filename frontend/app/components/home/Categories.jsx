'use client'

import { useEffect, useState } from 'react'
import { shopCategories } from '@/data/categories'
import { useInView } from '@/hooks/useInView'
import { api } from '@/lib/api/client'
import CategoryCard from '../ui/CategoryCard'
import ScrollReveal from '../ui/ScrollReveal'
import SectionHeading from '../ui/SectionHeading'

export default function Categories({ initialCategories }) {
  const [categories, setCategories] = useState(() => (Array.isArray(initialCategories) && initialCategories.length > 0 ? initialCategories : shopCategories))
  const [containerRef, inView] = useInView({ rootMargin: '350px' })

  useEffect(() => {
    if (Array.isArray(initialCategories)) setCategories(initialCategories)
  }, [initialCategories])

  useEffect(() => {
    // The parent refreshes SSR data in place; retain the original fallback fetch.
    if (!inView || (Array.isArray(initialCategories) && initialCategories.length > 0)) return
    let active = true
    api.categories.list()
      .then((data) => {
        if (active && Array.isArray(data) && data.length > 0) {
          setCategories(data)
        }
      })
      .catch(() => {})
    return () => { active = false }
  }, [inView, initialCategories])

  return (
    <section ref={containerRef} className="container-page studio-section">
      <SectionHeading
        eyebrow="Wander the shelves"
        title="Shop by category"
        description="Find a small treasure, or start with a feeling — toys, flowers, keepsakes, and custom magic."
      />
      <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {(Array.isArray(categories) ? categories : []).map((category, i) => (
          <ScrollReveal key={category.id || category.slug} delay={i * 0.05}>
            <CategoryCard category={{ ...category, id: category.slug || category.id }} />
          </ScrollReveal>
        ))}
      </div>
    </section>
  )
}
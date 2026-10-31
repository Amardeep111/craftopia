'use client'

import Link from 'next/link'
import { ArrowUpRight } from 'lucide-react'
import Badge from './Badge'
import ProductImage from './ProductImage'
import Card from './Card'
import { formatPrice } from '@/data/products'
import { categories } from '@/data/categories'
import { cn } from '@/lib/cn'
import { discountedPrice, useProductDiscount } from '@/lib/promotions'

export default function ProductCard({ product, className }) {
  const discountPercent = useProductDiscount(product.id)
  const salePrice = discountedPrice(product.price, discountPercent)
  const categoryName =
    product.categoryName ||
    product.category?.name ||
    (typeof product.category === 'string'
      ? categories.find((c) => c.id === product.category || c.slug === product.category)?.name
      : null) ||
    null

  let photo = product.imageUrl || product.image || null
  if (!photo && product.images) {
    if (Array.isArray(product.images) && product.images.length > 0) {
      photo = product.images[0]
    } else if (typeof product.images === 'string') {
      try {
        const parsed = JSON.parse(product.images)
        if (Array.isArray(parsed) && parsed.length > 0) {
          photo = parsed[0]
        } else if (product.images.startsWith('http') || product.images.startsWith('/')) {
          photo = product.images
        }
      } catch {
        if (product.images.startsWith('http') || product.images.startsWith('/')) {
          photo = product.images
        }
      }
    }
  }

  const palette = Array.isArray(product.palette)
    ? product.palette
    : typeof product.palette === 'string'
      ? (() => {
          try {
            const p = JSON.parse(product.palette)
            return Array.isArray(p) ? p : undefined
          } catch {
            return undefined
          }
        })()
      : undefined

  return (
    <Card
      hoverable
      className={cn('group flex h-full flex-col overflow-hidden', className)}
    >
      <Link href={`/shop/${product.id}`} prefetch={true} className="relative block aspect-[4/5] overflow-hidden bg-sand">
        <ProductImage
          src={photo}
          alt={product.name}
          visual={product.visual}
          palette={palette}
          fit="cover"
          className="h-full w-full"
          imgClassName="object-cover"
        />
        <Badge className="absolute left-3 top-3">Handmade</Badge>
        {product.stock <= 0 && <span className="absolute inset-x-0 bottom-0 bg-ink/80 px-3 py-2 text-center text-sm font-semibold text-white">Out of stock</span>}
        {product.availableForSale === false && product.stock > 0 && <span className="absolute inset-x-0 bottom-0 bg-ink/80 px-3 py-2 text-center text-sm font-semibold text-white">Temporarily unavailable</span>}
        {discountPercent > 0 && <span className="absolute right-3 top-3 rounded-full bg-bloom px-3 py-1 text-xs font-bold text-white">{discountPercent}% OFF</span>}
      </Link>
      <div className="flex flex-1 flex-col p-5">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-bloom">
          {categoryName}
        </p>
        <h3 className="mt-2 font-display text-2xl text-plum">
          <Link href={`/shop/${product.id}`} prefetch={true} className="transition hover:text-bloom">
            {product.name}
          </Link>
        </h3>
        <p className="mt-2 flex-1 text-sm leading-relaxed text-muted">{product.short}</p>
        <div className="mt-4 flex items-center justify-between gap-3">
          <div className="flex flex-wrap items-baseline gap-2"><p className="font-semibold text-plum">{formatPrice(salePrice)}</p>{discountPercent > 0 && <><span className="text-sm text-muted line-through">{formatPrice(product.price)}</span><span className="text-xs font-semibold text-moss">{discountPercent}% off</span></>}</div>
          <Link
            href={`/shop/${product.id}`}
            prefetch={true}
            className="inline-flex items-center gap-1 text-sm font-semibold text-plum transition hover:text-bloom"
          >
            View details
            <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        </div>
      </div>
    </Card>
  )
}

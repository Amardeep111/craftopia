import Link from 'next/link'
import { Flower2 } from 'lucide-react'
import ProductDetailsClient from './ProductDetailsClient'

export const revalidate = 60

const BACKEND_URL = (process.env.GO_BACKEND_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080').replace(/\/$/, '')

async function fetchProduct(productId) {
  try {
    const res = await fetch(`${BACKEND_URL}/api/products/${encodeURIComponent(productId)}`, {
      next: { revalidate: 60 },
    })
    if (!res.ok) return null
    const json = await res.json()
    return json?.data || null
  } catch (err) {
    console.error('Error fetching product from Go service:', err)
    return null
  }
}

async function fetchRelatedProducts(categoryId, currentId) {
  try {
    const res = await fetch(`${BACKEND_URL}/api/products?limit=12`, { next: { revalidate: 60 } })
    if (!res.ok) return []
    const json = await res.json()
    const list = Array.isArray(json?.data) ? json.data : []
    return list.filter((p) => String(p.id) !== String(currentId) && p.slug !== currentId).slice(0, 4)
  } catch {
    return []
  }
}

export async function generateMetadata({ params }) {
  try {
    const { productId } = await params
    const raw = await fetchProduct(productId)
    if (!raw || raw.published === false) {
      return { title: "Piece Not Found | Jamae's Craftopia" }
    }
    return {
      title: `${raw.name} | Jamae's Craftopia`,
      description: raw.short || raw.description?.slice(0, 160) || "Handmade piece from Jamae's Craftopia.",
    }
  } catch {
    return { title: "Handmade Piece | Jamae's Craftopia" }
  }
}

export default async function ProductDetailsPage({ params }) {
  const { productId } = await params
  let product = null
  let relatedProducts = []

  try {
    const raw = await fetchProduct(productId)
    if (raw && raw.published !== false) {
      const categoryId = raw.categoryId || raw.category?.slug || raw.category?.id || raw.category || null
      const categoryName = raw.category?.name || raw.categoryName || ''
      const photoList = Array.isArray(raw.images)
        ? raw.images
        : typeof raw.images === 'string'
          ? (() => {
              try {
                const parsed = JSON.parse(raw.images)
                return Array.isArray(parsed) ? parsed : [raw.images]
              } catch {
                return raw.images.trim() ? [raw.images.trim()] : []
              }
            })()
          : []

      const primaryPhoto = raw.imageUrl || raw.image || photoList[0] || null

      product = {
        id: String(raw.id),
        name: raw.name,
        slug: raw.slug || String(raw.id),
        categoryId,
        category: categoryId,
        categoryName,
        price: Number(raw.price) || 0,
        discountPercent: Number(raw.discountPercent) || 0,
        gstPercent: Number(raw.gstPercent) || 0,
        codFee: Number(raw.codFee) || 0,
        otherCharge: Number(raw.otherCharge) || 0,
        featured: Boolean(raw.featured),
        short: raw.short || '',
        description: raw.description || '',
        materials: raw.materials || '',
        care: raw.care || '',
        customization: raw.customization || '',
        visual: raw.visual || 'yarn',
        palette: raw.palette || null,
        images: photoList,
        image: primaryPhoto,
        imageUrl: raw.imageUrl || primaryPhoto,
        stock: Number(raw.stock) || 0,
        availableForSale: raw.availableForSale !== false,
        unavailableStates: Array.isArray(raw.unavailableStates) ? raw.unavailableStates : [],
        unavailablePinCodes: Array.isArray(raw.unavailablePinCodes) ? raw.unavailablePinCodes : [],
      }

      relatedProducts = await fetchRelatedProducts(categoryId, raw.id)
    }
  } catch (error) {
    console.error('Error loading product details on server:', error)
  }

  if (!product) {
    return (
      <div className="container-page py-20">
        <div className="paper-card mx-auto max-w-lg px-8 py-14 text-center">
          <Flower2 className="mx-auto h-10 w-10 text-petal" aria-hidden="true" />
          <h2 className="mt-4 font-display text-3xl text-plum">This piece is not on the shelf</h2>
          <p className="mt-3 text-muted">
            It may have been a mistyped link. Wander back to the shop to find something lovely.
          </p>
          <Link
            href="/shop"
            className="mt-6 inline-flex items-center justify-center rounded-full bg-plum px-5 py-2.5 text-sm font-semibold text-cream shadow-soft transition hover:bg-ink hover:-translate-y-0.5 hover:shadow-lift active:translate-y-0"
          >
            Back to shop
          </Link>
        </div>
      </div>
    )
  }

  return <ProductDetailsClient initialProduct={product} initialRelatedProducts={relatedProducts} productId={productId} />
}

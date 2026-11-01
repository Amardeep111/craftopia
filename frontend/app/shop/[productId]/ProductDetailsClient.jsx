'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ChevronLeft, Minus, Plus, Flower2 } from 'lucide-react'
import { useCartStore } from '@/lib/cart'
import { categories } from '@/data/categories'
import { formatPrice } from '@/data/products'
import Badge from '@/components/ui/Badge'
import Button from '@/components/ui/Button'
import Modal from '@/components/ui/Modal'
import ProductCard from '@/components/ui/ProductCard'
import Select from '@/components/ui/dropdown/Select'
import { indiaStates } from '@/lib/india-states'
import ProductImageGallery from '@/components/ui/ProductImageGallery'
import SkeletonCard from '@/components/ui/SkeletonCard'
import CustomerReviews from '@/components/ui/CustomerReviews'
import { discountedPrice, useProductPricing } from '@/lib/promotions'

export default function ProductDetailsClient({ initialProduct, initialRelatedProducts = [], productId, descriptionContent, customizationContent, materialsContent, careContent }) {
  const router = useRouter()
  const [product, setProduct] = useState(initialProduct || null)
  const [productResolved, setProductResolved] = useState(Boolean(initialProduct))
  const [relatedProducts, setRelatedProducts] = useState(() => (Array.isArray(initialRelatedProducts) ? initialRelatedProducts : []))
  const [relatedLoading, setRelatedLoading] = useState(() => !Array.isArray(initialRelatedProducts) || initialRelatedProducts.length === 0)
  const { discountPercent, gstPercent, codFee, otherCharge } = useProductPricing(productId)
  const salePrice = product ? discountedPrice(product.price, discountPercent) : 0
  const cartProduct = product ? { ...product, originalPrice: product.price, discountPercent, gstPercent, codFee, otherCharge, price: salePrice } : product
  const [qty, setQty] = useState(1)
  const [customOpen, setCustomOpen] = useState(false)
  const [addedConfirm, setAddedConfirm] = useState(false)
  const [goToBag, setGoToBag] = useState(false)
  const [deliveryState, setDeliveryState] = useState('')
  const [deliveryPin, setDeliveryPin] = useState('')
  const [deliveryResult, setDeliveryResult] = useState(null)
  const addItem = useCartStore((s) => s.addItem)

  useEffect(() => {
    if (initialProduct && (initialProduct.id === productId || initialProduct.slug === productId)) {
      setProduct(initialProduct)
      setProductResolved(true)
      return
    }
    let active = true
    fetch(`/api/products/${encodeURIComponent(productId)}`, { cache: 'no-store' })
      .then((response) => response.json())
      .then((result) => {
        if (!active) return
        setProduct(result.success ? result.data : null)
        setProductResolved(true)
      })
      .catch(() => {
        if (active) setProductResolved(true)
      })
    return () => {
      active = false
    }
  }, [productId, initialProduct])

  useEffect(() => {
    // If SSR already pre-loaded related products, skip client fetch
    if (Array.isArray(initialRelatedProducts) && initialRelatedProducts.length > 0) return
    let active = true
    setRelatedLoading(true)
    fetch('/api/products?limit=50', { cache: 'no-store' })
      .then((res) => res.json())
      .then((result) => {
        if (!active || !result?.success || !Array.isArray(result.data)) return
        const currentId = productId
        const currentCategory = product?.categoryId || (typeof product?.category === 'object' ? product?.category?.id || product?.category?.slug : product?.category)
        const others = result.data.filter((p) => p.id !== currentId && p.slug !== currentId)
        const sameCat = currentCategory ? others.filter((p) => (p.categoryId || p.category) === currentCategory) : []
        const diffCat = currentCategory ? others.filter((p) => (p.categoryId || p.category) !== currentCategory) : others
        const combined = [...sameCat, ...diffCat].slice(0, 4)
        if (combined.length > 0) {
          setRelatedProducts(combined)
        }
      })
      .catch(() => {})
      .finally(() => {
        setRelatedLoading(false)
      })
    return () => {
      active = false
    }
  }, [productId, product?.categoryId, product?.category, initialRelatedProducts])

  const categoryId = product?.categoryId || (typeof product?.category === 'object' ? product?.category?.id || product?.category?.slug : product?.category)
  const category = categoryId ? categories.find((c) => c.id === categoryId || c.slug === categoryId) : null
  const outOfStock = product && Number.isFinite(Number(product.stock)) && Number(product.stock) <= 0
  const locationRestricted = product?.availableForSale === false || Boolean(deliveryResult && !deliveryResult.available)

  function checkDelivery() {
    const state = deliveryState.trim().toLocaleLowerCase('en-IN').replace(/[.\s]+/g, ' ')
    const pin = deliveryPin.replace(/\D/g, '')
    if (product?.availableForSale === false) {
      setDeliveryResult({ available: false, message: 'This item is temporarily unavailable for purchase.' })
      return
    }
    if (!state && pin.length !== 6) {
      setDeliveryResult({ available: false, message: 'Enter a state or a 6-digit PIN code to check delivery.' })
      return
    }
    const blockedState = (product?.unavailableStates || []).find((value) => String(value).trim().toLocaleLowerCase('en-IN').replace(/[.\s]+/g, ' ') === state)
    const blockedPin = (product?.unavailablePinCodes || []).find((value) => String(value).replace(/\D/g, '') === pin)
    if (blockedState) setDeliveryResult({ available: false, message: `This item is not available for delivery to ${deliveryState.trim()}.` })
    else if (pin.length === 6 && blockedPin) setDeliveryResult({ available: false, message: `This item is not available for delivery to PIN code ${pin}.` })
    else if (outOfStock) setDeliveryResult({ available: false, message: 'This item is currently out of stock.' })
    else setDeliveryResult({ available: true, message: 'Delivery is available to this location. Final serviceability is checked at checkout.' })
  }

  if (!product && productResolved) {
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

  // If initialProduct is resolving on client transition, keep layout stable with only collage loading
  if (!product) {
    return (
      <div className="container-page pb-20 pt-6">
        <div className="mt-8 grid gap-10 lg:grid-cols-2">
          <ProductImageGallery loading={true} />
          <div className="space-y-4">
            <Badge>Handmade</Badge>
            <div className="h-10 w-3/4 rounded-xl bg-sand/40 animate-pulse" />
            <div className="h-6 w-1/3 rounded-lg bg-sand/30 animate-pulse" />
          </div>
        </div>
      </div>
    )
  }

  return (
    <>
      <div className="container-page pb-20 pt-6">
        {/* Breadcrumb */}
        <nav className="flex flex-wrap items-center gap-2 text-sm text-muted" aria-label="Breadcrumb">
          <Link
            href="/shop"
            className="inline-flex items-center gap-1 font-semibold text-plum hover:text-bloom"
          >
            <ChevronLeft className="h-4 w-4" />
            Shop
          </Link>
          <span aria-hidden="true">/</span>
          <Link href={`/shop?category=${categoryId || ''}`} className="hover:text-plum">
            {category?.name || product?.categoryName || product?.category?.name || 'Collection'}
          </Link>
          <span aria-hidden="true">/</span>
          <span className="text-plum">{product.name}</span>
        </nav>

        {/* Product layout */}
        <div className="mt-8 grid gap-10 lg:grid-cols-2">
          {/* Images: Shows collage loading state while images are fetching */}
          <div>
            <ProductImageGallery product={product} />
          </div>

          {/* Info: Real data renders immediately on page load */}
          <div>
            <Badge>Handmade</Badge>
            <h1 className="heading-display mt-3 text-4xl sm:text-5xl">{product.name}</h1>
            <p className="mt-2 text-sm font-semibold uppercase tracking-[0.18em] text-bloom">
              {category?.name || product?.categoryName || product?.category?.name || ''}
            </p>
            <div className="mt-4 flex flex-wrap items-baseline gap-3">
              <p className="text-2xl font-semibold text-plum">{formatPrice(salePrice)}</p>
              {discountPercent > 0 && (
                <>
                  <span className="text-base text-muted line-through">{formatPrice(product.price)}</span>
                  <span className="rounded-full bg-bloom/10 px-3 py-1 text-sm font-bold text-bloom">
                    {discountPercent}% off
                  </span>
                </>
              )}
            </div>
            {(gstPercent > 0 || codFee > 0 || otherCharge > 0) && (
              <p className="mt-2 text-xs text-muted">
                {[
                  gstPercent > 0 ? `GST ${gstPercent}%` : null,
                  codFee > 0 ? `COD fee ${formatPrice(codFee)} per item` : null,
                  otherCharge > 0 ? `Other charge ${formatPrice(otherCharge)} per item` : null,
                ]
                  .filter(Boolean)
                  .join(' · ')}
                . Calculated at checkout.
              </p>
            )}
            <section className="mt-5 space-y-4" aria-label="Product description and details">
              <div>
                <h2 className="font-semibold text-plum">Description</h2>
                <div className="mt-1 text-muted">{descriptionContent || product.description || product.short}</div>
              </div>
              <div className="space-y-4 rounded-2xl bg-ivory/80 p-4">
                <h2 className="font-semibold text-plum">Product details</h2>
                <div>
                  <h3 className="text-sm font-medium text-plum">Customization</h3>
                  <div className="mt-1 text-sm text-muted">{customizationContent || product.customization || 'Made with care to your preferences.'}</div>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-plum">Materials</h3>
                  <div className="mt-1 text-sm text-muted">{materialsContent || product.materials || 'Soft cotton-blend yarn and fine details.'}</div>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-plum">Care</h3>
                  <div className="mt-1 text-sm text-muted">{careContent || product.care || 'Spot clean gently with a damp cloth.'}</div>
                </div>
              </div>
            </section>

            <section className="mt-5 rounded-2xl border border-sand bg-ivory/70 p-4" aria-label="Delivery availability">
              <h2 className="text-sm font-semibold text-plum">Check delivery availability</h2>
              <div className="mt-3 grid gap-2 sm:grid-cols-[minmax(0,1fr)_9rem_auto]">
                <Select
                  label="State (optional)"
                  options={indiaStates.map((state) => ({ value: state, label: state }))}
                  value={deliveryState}
                  onChange={(value) => {
                    setDeliveryState(value)
                    setDeliveryResult(null)
                  }}
                  placeholder="Choose a state"
                  showSearch
                  searchPlaceholder="Search states..."
                />
                <label className="block text-sm font-semibold text-plum">
                  PIN code (optional)
                  <input
                    aria-label="Delivery PIN code"
                    inputMode="numeric"
                    maxLength={6}
                    value={deliveryPin}
                    onChange={(event) => {
                      setDeliveryPin(event.target.value.replace(/\D/g, '').slice(0, 6))
                      setDeliveryResult(null)
                    }}
                    placeholder="6-digit PIN"
                    className="mt-1.5 min-h-11 w-full rounded-xl border border-sand bg-white px-3 text-sm font-normal"
                  />
                </label>
                <button
                  type="button"
                  onClick={checkDelivery}
                  className="min-h-11 self-end rounded-xl bg-plum px-4 text-sm font-semibold text-cream"
                >
                  Check
                </button>
              </div>
              {deliveryResult && (
                <p
                  role={deliveryResult.available ? 'status' : 'alert'}
                  className={`mt-2 text-sm ${deliveryResult.available ? 'text-green-800' : 'text-bloom'}`}
                >
                  {deliveryResult.message}
                </p>
              )}
              {!deliveryResult &&
                ((product.unavailableStates && product.unavailableStates.length > 0) ||
                  (product.unavailablePinCodes && product.unavailablePinCodes.length > 0)) && (
                  <p className="mt-2 text-xs text-muted">
                    Some delivery areas are excluded. Check your state or PIN code.
                  </p>
                )}
            </section>

            {/* Purchase controls */}
            <div className="mt-8 flex flex-wrap items-center gap-4">
              {/* Quantity */}
              <div className="inline-flex items-center rounded-full bg-ivory ring-1 ring-sand">
                <button
                  type="button"
                  className="p-3 text-plum"
                  aria-label="Decrease quantity"
                  onClick={() => setQty((q) => Math.max(1, q - 1))}
                >
                  <Minus className="h-4 w-4" />
                </button>
                <span className="min-w-8 text-center font-semibold" aria-live="polite">
                  {qty}
                </span>
                <button
                  type="button"
                  className="p-3 text-plum"
                  aria-label="Increase quantity"
                  onClick={() => setQty((q) => q + 1)}
                >
                  <Plus className="h-4 w-4" />
                </button>
              </div>

              {/* Add to Cart */}
              <Button
                disabled={outOfStock || locationRestricted}
                onClick={() => {
                  if (outOfStock || locationRestricted) return
                  if (goToBag) {
                    window.location.href = '/cart'
                    return
                  }
                  try {
                    addItem(cartProduct, qty)
                    setAddedConfirm(true)
                    setGoToBag(false)
                    setTimeout(() => {
                      setAddedConfirm(false)
                      setGoToBag(true)
                    }, 1200)
                  } catch (_) {
                    // Keep button usable
                  }
                }}
                variant="outline"
                className="border-plum/40 ring-1 ring-plum/10 hover:border-plum/60 hover:ring-plum/20 hover:shadow-[0_2px_8px_rgba(95,45,75,0.08)] focus:ring-plum/30 active:border-plum/70"
              >
                {outOfStock
                  ? 'Out of stock'
                  : product.availableForSale === false
                  ? 'Temporarily unavailable'
                  : locationRestricted
                  ? 'Unavailable at this location'
                  : goToBag
                  ? 'Go to Bag'
                  : addedConfirm
                  ? 'Added to Bag'
                  : 'Add to Cart'}
              </Button>

              {/* Buy Now */}
              <Button
                disabled={outOfStock || locationRestricted}
                onClick={() => {
                  if (outOfStock || locationRestricted) return
                  addItem(cartProduct, qty)
                  router.push('/checkout/address')
                }}
              >
                Buy Now
              </Button>

              {/* Customization */}
              <Button variant="secondary" onClick={() => setCustomOpen(true)}>
                Ask for Customization
              </Button>
            </div>
          </div>
        </div>

        {/* Related Products */}
        {relatedLoading ? (
          <section className="mt-20">
            <h2 className="heading-display text-3xl">You might also love</h2>
            <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <SkeletonCard key={i} />
              ))}
            </div>
          </section>
        ) : relatedProducts.length > 0 ? (
          <section className="mt-20">
            <h2 className="heading-display text-3xl">You might also love</h2>
            <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {relatedProducts.map((p) => (
                <ProductCard key={p.id} product={p} />
              ))}
            </div>
          </section>
        ) : null}

        {/* Customization Modal */}
        <Modal open={customOpen} title="A more personal version" onClose={() => setCustomOpen(false)}>
          <p className="text-muted">
            Tell us the colour, size, or tiny detail you are dreaming of. We will reply with what is possible.
          </p>
          <div className="mt-6">
            <Link
              href="/custom-orders"
              onClick={() => setCustomOpen(false)}
              className="inline-flex items-center justify-center rounded-full bg-plum px-5 py-2.5 text-sm font-semibold text-cream shadow-soft transition hover:bg-ink hover:-translate-y-0.5 hover:shadow-lift active:translate-y-0"
            >
              Start a custom request
            </Link>
          </div>
        </Modal>
      </div>

      {/* Customer Reviews — below product */}
      <CustomerReviews product={product} />
    </>
  )
}


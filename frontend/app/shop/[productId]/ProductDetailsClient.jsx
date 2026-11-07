'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ChevronLeft, ChevronDown, Minus, Plus, Flower2 } from 'lucide-react'
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
  const [cartFeedback, setCartFeedback] = useState('')
  const [descriptionExpanded, setDescriptionExpanded] = useState(false)
  const [descriptionHasOverflow, setDescriptionHasOverflow] = useState(false)
  const [showStickyPurchase, setShowStickyPurchase] = useState(false)
  const descriptionRef = useRef(null)
  const purchaseOptionsRef = useRef(null)
  const addItem = useCartStore((s) => s.addItem)
  const setBuyNow = useCartStore((s) => s.setBuyNow)
  const cartItems = useCartStore((s) => s.items)

  useEffect(() => {
    const content = descriptionRef.current
    if (!content || descriptionExpanded) return
    const updateOverflow = () => setDescriptionHasOverflow(content.scrollHeight > content.clientHeight + 4)
    updateOverflow()
    const observer = new ResizeObserver(updateOverflow)
    observer.observe(content)
    return () => observer.disconnect()
  }, [descriptionExpanded, product?.id, product?.description, descriptionContent])

  useEffect(() => {
    const purchaseOptions = purchaseOptionsRef.current
    if (!purchaseOptions) return
    const observer = new IntersectionObserver(([entry]) => {
      setShowStickyPurchase(!entry.isIntersecting)
    }, { threshold: 0.05 })
    observer.observe(purchaseOptions)
    return () => observer.disconnect()
  }, [product?.id])

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
  const hasStockCount = product && product.stock !== null && product.stock !== undefined && Number.isFinite(Number(product.stock))
  const stockCount = hasStockCount ? Math.max(0, Number(product.stock)) : 99
  const cartQuantity = product ? (cartItems || []).find((item) => item.id === product.id)?.quantity || 0 : 0
  const maxOrderQuantity = Math.max(0, Math.min(99, stockCount - cartQuantity))
  const outOfStock = Boolean(product && (product.availableForSale === false || maxOrderQuantity <= 0))
  const deliveryRestricted = deliveryResult?.restricted === true
  const purchaseBlocked = outOfStock || deliveryRestricted

  useEffect(() => {
    setQty((quantity) => Math.min(Math.max(1, quantity), Math.max(1, maxOrderQuantity)))
  }, [maxOrderQuantity])

  function handleAddToCart() {
    if (purchaseBlocked) return
    if (goToBag) {
      router.push('/cart')
      return
    }
    try {
      addItem(cartProduct, qty)
      setCartFeedback(`${qty} ${qty === 1 ? 'item' : 'items'} added to your bag.`)
      setAddedConfirm(true)
      setGoToBag(false)
      window.setTimeout(() => {
        setAddedConfirm(false)
        setGoToBag(true)
      }, 1200)
    } catch {
      setCartFeedback('We could not add this item. Please try again.')
    }
  }

  function handleBuyNow() {
    if (purchaseBlocked) return
    try {
      setBuyNow(cartProduct, qty)
      router.push('/checkout/address?buyNow=1')
    } catch {
      setCartFeedback('We could not start checkout. Please try again.')
    }
  }

  function checkDelivery() {
    const state = deliveryState.trim().toLocaleLowerCase('en-IN').replace(/[.\s]+/g, ' ')
    const pin = deliveryPin.replace(/\D/g, '')
    if (product?.availableForSale === false) {
      setDeliveryResult({ available: false, restricted: true, message: 'This item is temporarily unavailable for purchase.' })
      return
    }
    if (!state && pin.length !== 6) {
      setDeliveryResult({ available: false, restricted: false, message: 'Enter a state or a 6-digit PIN code to check delivery.' })
      return
    }
    if (pin.length > 0 && pin.length !== 6) {
      setDeliveryResult({ available: false, restricted: false, message: 'Enter all 6 digits of the PIN code, or clear it and check by state.' })
      return
    }
    const blockedState = (product?.unavailableStates || []).find((value) => String(value).trim().toLocaleLowerCase('en-IN').replace(/[.\s]+/g, ' ') === state)
    const blockedPin = (product?.unavailablePinCodes || []).find((value) => String(value).replace(/\D/g, '') === pin)
    if (blockedState) setDeliveryResult({ available: false, restricted: true, message: `This item is not available for delivery to ${deliveryState.trim()}.` })
    else if (pin.length === 6 && blockedPin) setDeliveryResult({ available: false, restricted: true, message: `This item is not available for delivery to PIN code ${pin}.` })
    else if (outOfStock) setDeliveryResult({ available: false, restricted: false, message: 'This item is currently out of stock.' })
    else setDeliveryResult({ available: true, restricted: false, message: 'Delivery is available to this location. Final serviceability is checked at checkout.' })
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
      <div className="container-page pb-32 pt-6 lg:pb-20">
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
            <p className="inline-flex items-center gap-2 text-sm font-semibold text-moss"><Flower2 className="h-4 w-4" aria-hidden="true" /> Handmade</p>
            <h1 className="heading-display mt-2 text-3xl sm:text-4xl">{product.name}</h1>
            <p className="mt-2 text-sm font-semibold text-bloom">
              {category?.name || product?.categoryName || product?.category?.name || ''}
            </p>
            <div className="mt-4 flex flex-wrap items-baseline gap-3">
              <p className="text-3xl font-semibold tracking-tight text-plum">{formatPrice(salePrice)}</p>
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
                  .join(', ')}
                . Calculated at checkout.
              </p>
            )}
            <section className="mt-5 space-y-4" aria-label="Product description and details">
              <div>
                <h2 className="heading-display text-xl">Description</h2>
                <div className="relative mt-1">
                  <div ref={descriptionRef} className={`overflow-hidden text-muted transition-[max-height] duration-300 ${descriptionExpanded ? 'max-h-[200rem]' : 'max-h-48'}`}>
                    {descriptionContent || product.description || product.short}
                  </div>
                  {!descriptionExpanded && descriptionHasOverflow && <div className="pointer-events-none absolute inset-x-0 bottom-0 h-12 bg-gradient-to-t from-cream to-transparent" aria-hidden="true" />}
                </div>
                {(descriptionHasOverflow || descriptionExpanded) && (
                  <button type="button" aria-expanded={descriptionExpanded} onClick={() => setDescriptionExpanded((expanded) => !expanded)} className="mt-2 inline-flex min-h-10 items-center gap-1 rounded-full px-3 text-sm font-semibold text-plum transition hover:bg-blush/25">
                    {descriptionExpanded ? 'Read less' : 'Read more'} <span aria-hidden="true">{descriptionExpanded ? '↑' : '↓'}</span>
                  </button>
                )}
              </div>
              <details className="group border-y border-sand/80 py-4">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-semibold text-plum focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-plum">
                  <span>Materials, care & customization</span>
                  <ChevronDown className="h-4 w-4 shrink-0 text-moss transition-transform group-open:rotate-180" aria-hidden="true" />
                </summary>
                <div className="mt-4 space-y-4">
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
              </details>
            </section>

            <details className="group mt-5 border-y border-sand/80 py-4" aria-label="Delivery availability">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-sm font-semibold text-plum focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-plum">
                <span>Check delivery to your area <span className="mt-1 block text-xs font-normal text-muted">Use your state or PIN code</span></span>
                <ChevronDown className="h-4 w-4 shrink-0 text-moss transition-transform group-open:rotate-180" aria-hidden="true" />
              </summary>
              <div className="pt-3">
                <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_9rem_auto]">
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
              </div>
            </details>

            <section ref={purchaseOptionsRef} className="mt-6 border-y border-sand py-4" aria-label="Purchase options">
              <div className="flex items-center gap-2 sm:gap-3">
                <div className="inline-flex shrink-0 items-center rounded-full bg-ivory ring-1 ring-sand">
                  <button type="button" disabled={qty <= 1} className="p-3 text-plum disabled:opacity-40" aria-label="Decrease quantity" onClick={() => setQty((q) => Math.max(1, q - 1))}><Minus className="h-4 w-4" /></button>
                  <span className="min-w-7 text-center text-sm font-semibold" aria-live="polite">{qty}</span>
                  <button type="button" disabled={qty >= maxOrderQuantity} className="p-3 text-plum disabled:opacity-40" aria-label="Increase quantity" onClick={() => setQty((q) => Math.min(maxOrderQuantity, q + 1))}><Plus className="h-4 w-4" /></button>
                </div>
                <Button disabled={purchaseBlocked} onClick={handleAddToCart} className="min-h-11 min-w-0 flex-1 px-3 text-sm">{product.availableForSale === false ? 'Unavailable' : maxOrderQuantity <= 0 ? 'Stock limit reached' : deliveryRestricted ? 'Not deliverable here' : goToBag ? 'Go to bag' : addedConfirm ? 'Added to bag' : 'Add to bag'}</Button>
                <Button disabled={purchaseBlocked} onClick={handleBuyNow} variant="outline" className="min-h-11 min-w-0 flex-1 border-plum/30 px-3 text-sm">Buy now</Button>
              </div>
              <div className="mt-3 flex min-h-8 items-center justify-between gap-3">
                <button type="button" onClick={() => setCustomOpen(true)} className="text-left text-xs font-medium text-plum underline decoration-plum/30 underline-offset-4 hover:decoration-plum">Request a custom version</button>
                {hasStockCount && maxOrderQuantity > 0 && maxOrderQuantity <= 5 && <span className="text-right text-xs text-muted">Only {maxOrderQuantity} left</span>}
              </div>
              {cartFeedback && <p className="mt-2 text-sm text-plum" role="status" aria-live="polite">{cartFeedback}</p>}
            </section>

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
      {showStickyPurchase && <section className="fixed inset-x-0 bottom-0 z-40 border-t border-sand bg-white/95 px-3 pt-2 shadow-[0_-8px_24px_rgba(95,45,75,0.10)] backdrop-blur lg:hidden" style={{ paddingBottom: 'max(env(safe-area-inset-bottom), 0.5rem)' }} aria-label="Quick purchase options">
        <div className="mx-auto flex max-w-xl items-center gap-2">
          <div className="inline-flex shrink-0 items-center rounded-full bg-ivory ring-1 ring-sand">
            <button type="button" disabled={qty <= 1} className="p-2.5 text-plum disabled:opacity-40" aria-label="Decrease quantity" onClick={() => setQty((q) => Math.max(1, q - 1))}><Minus className="h-4 w-4" /></button>
            <span className="min-w-6 text-center text-sm font-semibold" aria-live="polite">{qty}</span>
            <button type="button" disabled={qty >= maxOrderQuantity} className="p-2.5 text-plum disabled:opacity-40" aria-label="Increase quantity" onClick={() => setQty((q) => Math.min(maxOrderQuantity, q + 1))}><Plus className="h-4 w-4" /></button>
          </div>
          <Button disabled={purchaseBlocked} onClick={handleAddToCart} variant="outline" size="sm" className="min-h-11 flex-1 px-3">{maxOrderQuantity <= 0 ? 'Unavailable' : goToBag ? 'Go to Bag' : addedConfirm ? 'Added' : 'Add to cart'}</Button>
          <Button disabled={purchaseBlocked} onClick={handleBuyNow} size="sm" className="min-h-11 flex-1 px-3">Buy now · {formatPrice(salePrice)}</Button>
        </div>
        {cartFeedback && <p role="status" aria-live="polite" className="mx-auto max-w-xl truncate pb-1 pt-1 text-center text-xs text-plum">{cartFeedback}</p>}
      </section>}

      {/* Customer Reviews — below product */}
      <CustomerReviews product={product} />
    </>
  )
}


'use client'

import { useState, useMemo, useCallback, useEffect } from 'react'
import {
  Star, ChevronLeft, ChevronRight, ThumbsUp, Camera, X, Filter
} from 'lucide-react'
import { cn } from '@/lib/cn'
import { getOptimizedImageUrl } from '@/lib/images'
import { useInView } from '@/hooks/useInView'
import Select from './Select'
import Link from 'next/link'

function StarRating({ rating, max = 5, size = 'md', interactive = false, onSelect }) {
  const sz = size === 'sm' ? 'h-3.5 w-3.5' : size === 'lg' ? 'h-6 w-6' : 'h-4 w-4'
  const [hoverStar, setHoverStar] = useState(0)

  return (
    <div
      className={cn('flex items-center gap-0.5', interactive && 'cursor-pointer')}
      role={interactive ? 'radiogroup' : undefined}
      aria-label={interactive ? 'Select star rating' : `Rating ${rating} out of ${max}`}
      onMouseLeave={() => interactive && setHoverStar(0)}
    >
      {Array.from({ length: max }).map((_, i) => {
        const starValue = i + 1
        const isFilled = interactive
          ? (hoverStar > 0 ? hoverStar >= starValue : rating >= starValue)
          : Math.round(rating) >= starValue
        return (
          <button
            key={i}
            type="button"
            role={interactive ? 'radio' : undefined}
            onClick={interactive ? () => onSelect(starValue) : undefined}
            onMouseEnter={interactive ? () => setHoverStar(starValue) : undefined}
            aria-label={interactive ? `Rate ${starValue} stars` : undefined}
            aria-checked={interactive ? starValue === rating : undefined}
            disabled={!interactive}
            className={cn(
              'transition-transform duration-150 focus:outline-none',
              interactive ? 'hover:scale-110 active:scale-95' : ''
            )}
          >
            <Star
              className={cn(
                sz,
                isFilled ? 'fill-bloom text-bloom' : 'fill-sand/30 text-sand/30',
                interactive ? 'hover:text-bloom' : ''
              )}
              aria-hidden="true"
            />
          </button>
        )
      })}
    </div>
  )
}

export default function CustomerReviews({ product }) {
  const [sectionRef, inView] = useInView({ rootMargin: '400px' })
  const [reviews, setReviews] = useState([])
  const [reviewAccess, setReviewAccess] = useState({ authenticated: false, canReview: false })
  const [productRating, setProductRating] = useState(0)
  const [deliveryRating, setDeliveryRating] = useState(0)
  const [packagingRating, setPackagingRating] = useState(0)
  const [formTitle, setFormTitle] = useState('')
  const [formText, setFormText] = useState('')
  const [formPhotos, setFormPhotos] = useState([])
  const [formPhotoPreviews, setFormPhotoPreviews] = useState([])
  const [formError, setFormError] = useState('')
  const [formSubmitting, setFormSubmitting] = useState(false)
  const [formSuccess, setFormSuccess] = useState('')
  const avg = reviews.length ? reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length : 0
  const counts = useMemo(() => Object.fromEntries([1, 2, 3, 4, 5].map((rating) => [rating, reviews.filter((review) => Math.round(review.rating) === rating).length])), [reviews])
  const total = reviews.length

  const [expanded, setExpanded] = useState(false)
  const [sortBy, setSortBy] = useState('newest')
  const [filterStars, setFilterStars] = useState(0)
  const [lightbox, setLightbox] = useState({ open: false, images: [], index: 0 })
  const [helpful, setHelpful] = useState({})

  useEffect(() => {
    const previews = formPhotos.map((file) => URL.createObjectURL(file))
    setFormPhotoPreviews(previews)
    return () => previews.forEach((url) => URL.revokeObjectURL(url))
  }, [formPhotos])

  const refreshReviews = useCallback(async () => {
    if (!product?.id) return
    const response = await fetch(`/api/reviews/${encodeURIComponent(product.id)}`, { cache: 'no-store' })
    const result = await response.json()
    if (response.ok && result.success) {
      setReviews(result.reviews || [])
      setReviewAccess({ authenticated: Boolean(result.authenticated), canReview: Boolean(result.canReview) })
    }
  }, [product?.id])

  useEffect(() => {
    if (!inView || !product?.id) return
    refreshReviews().catch(() => {})
  }, [inView, product?.id, refreshReviews])

  const openLightbox = useCallback((images, start = 0) => {
    setLightbox({ open: true, images, index: start })
  }, [])

  const closeLightbox = useCallback(() => setLightbox({ open: false, images: [], index: 0 }), [])
  const nextImg = useCallback(() => {
    setLightbox((s) => ({ ...s, index: (s.index + 1) % s.images.length }))
  }, [])
  const prevImg = useCallback(() => {
    setLightbox((s) => ({ ...s, index: (s.index - 1 + s.images.length) % s.images.length }))
  }, [])

  const handleHelpful = useCallback((id) => {
    setHelpful((prev) => ({ ...prev, [id]: !prev[id] }))
  }, [])

  // Sort + filter logic
  const sorted = useMemo(() => {
    let list = [...reviews]
    if (filterStars > 0) list = list.filter((r) => Math.round(r.rating) === filterStars)
    if (sortBy === 'newest') list.sort((a, b) => new Date(b.date) - new Date(a.date))
    if (sortBy === 'highest') list.sort((a, b) => b.rating - a.rating)
    if (sortBy === 'lowest') list.sort((a, b) => a.rating - b.rating)
    if (sortBy === 'helpful') list.sort((a, b) => b.helpful - a.helpful)
    return list
  }, [reviews, sortBy, filterStars])

  const allCustomerPhotos = useMemo(() => {
    const photos = []
    reviews.forEach((r) => {
      if (r.photos && r.photos.length) {
        r.photos.forEach((src) => photos.push({ src, reviewName: r.name }))
      }
    })
    return photos
  }, [reviews])

  const submitReview = useCallback(async (event) => {
    event.preventDefault()
    setFormError('')
    setFormSuccess('')
    if (!productRating || !deliveryRating || !packagingRating) { setFormError('Rate the product, delivery, and packaging to continue.')
      return }
    if (formText.trim().length < 5) { setFormError('Please share at least 5 characters about your experience.')
      return }
    if (formPhotos.length > 5) { setFormError('You can upload up to 5 photos.')
      return }
    if (formPhotos.reduce((sum, file) => sum + file.size, 0) > 4 * 1024 * 1024) { setFormError('Review photos must be 4 MB total or smaller. Choose fewer or smaller images.')
      return }
    setFormSubmitting(true)
    try {
      let images = []
      if (formPhotos.length) {
        const uploadForm = new FormData()
        uploadForm.append('productId', product.id)
        formPhotos.forEach((file) => uploadForm.append('files', file))
        const uploadResponse = await fetch('/api/reviews/upload', { method: 'POST', body: uploadForm })
        const uploadResult = await uploadResponse.json()
        if (!uploadResponse.ok || !uploadResult.success) throw new Error(uploadResult.error || 'Review photos could not be uploaded.')
        images = uploadResult.images
      }
      const response = await fetch(`/api/reviews/${encodeURIComponent(product.id)}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ productRating, deliveryRating, packagingRating, title: formTitle, comment: formText, images }) })
      const result = await response.json()
      if (!response.ok || !result.success) throw new Error(result.error || 'Your review could not be saved.')
      setFormSuccess(result.message || 'Thank you for sharing your review.')
      setProductRating(0); setDeliveryRating(0); setPackagingRating(0); setFormTitle(''); setFormText(''); setFormPhotos([])
      await refreshReviews()
    } catch (error) { setFormError(error.message || 'Your review could not be saved.') }
    finally { setFormSubmitting(false) }
  }, [product?.id, productRating, deliveryRating, packagingRating, formText, formTitle, formPhotos, refreshReviews])

  return (
    <section ref={sectionRef} className="container-page mt-16 pt-14 pb-12 border-t border-sand/60" aria-label="Customer Reviews">
      <h2 className="heading-display text-3xl">Customer Reviews</h2>
      <p className="mt-2 text-muted max-w-xl">See what our customers think about this creation.</p>

      {/* ====== RATING SUMMARY ====== */}
      <div className="mt-10 grid gap-8 lg:grid-cols-[13rem_1fr] lg:gap-14 items-start">
        <div className="w-full sm:w-56">
          <div className="text-5xl font-display text-plum">{avg.toFixed(1)}</div>
          <div className="mt-1"><StarRating rating={avg} size="lg" /></div>
          <p className="text-sm text-muted mt-2">Based on {total} review{total !== 1 ? 's' : ''}</p>
        </div>

        <div className="w-full space-y-1.5">
          {[5, 4, 3, 2, 1].map((star) => {
            const count = counts[star] || 0
            const pct = total ? (count / total) * 100 : 0
            return (
              <div key={star} className="flex items-center gap-3 text-sm">
                <span className="w-3 font-semibold text-plum">{star}</span>
                <Star className="h-3.5 w-3.5 fill-bloom text-bloom shrink-0" aria-hidden="true" />
                <div className="flex-1 h-2.5 rounded-full bg-sand overflow-hidden">
                  <div
                    className="h-full rounded-full bg-bloom transition-all duration-700 ease-out"
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <span className="w-6 text-right text-muted tabular-nums">{count}</span>
              </div>
            )
          })}
        </div>
      </div>

      <section className="mt-10 rounded-3xl bg-cream p-5 shadow-soft ring-1 ring-sand sm:p-7" aria-label="Write a verified review">
        <h3 className="font-display text-2xl text-plum">Your experience matters</h3>
        {formSuccess && <p role="status" className="mt-3 text-sm text-green-800">{formSuccess}</p>}
        {reviewAccess.canReview ? <form onSubmit={submitReview} className="mt-5 space-y-5">
          <div className="grid gap-4 md:grid-cols-3">{[
            ['Product quality', productRating, setProductRating],
            ['Delivery experience', deliveryRating, setDeliveryRating],
            ['Packaging', packagingRating, setPackagingRating],
          ].map(([label, value, setter]) => <div key={label}><p className="text-sm font-semibold text-plum">{label}</p><div className="mt-2"><StarRating rating={value} interactive onSelect={setter} /></div></div>)}</div>
          <label className="block text-sm font-medium text-plum">Review title <span className="font-normal text-muted">(optional)</span><input value={formTitle} onChange={(event) => setFormTitle(event.target.value)} maxLength={120} className="mt-1.5 min-h-11 w-full rounded-xl border border-sand bg-white px-3" placeholder="What stood out?" /></label>
          <label className="block text-sm font-medium text-plum">Your review<textarea required minLength={5} maxLength={2000} value={formText} onChange={(event) => setFormText(event.target.value)} rows={4} className="mt-1.5 w-full rounded-xl border border-sand bg-white p-3" placeholder="Tell other shoppers about the product, packaging, and delivery." /></label>
          <div><label htmlFor="review-photos" className="block text-sm font-medium text-plum">Add customer photos <span className="font-normal text-muted">(up to 5, 4 MB total)</span></label><input id="review-photos" type="file" accept="image/jpeg,image/png,image/webp" multiple onChange={(event) => setFormPhotos([...(event.target.files || [])].slice(0, 5))} className="mt-2 block w-full rounded-xl border border-sand bg-white p-2 text-sm file:mr-3 file:rounded-full file:border-0 file:bg-plum file:px-4 file:py-2 file:font-semibold file:text-cream" />{formPhotos.length > 0 && <div className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-5">{formPhotos.map((file, index) => <figure key={`${file.name}-${file.lastModified}`} className="overflow-hidden rounded-xl border border-sand bg-white"><img src={formPhotoPreviews[index]} alt={`Review photo preview ${index + 1}`} className="aspect-square w-full object-cover" /><figcaption className="truncate px-2 py-1 text-xs text-muted">{file.name}</figcaption></figure>)}</div>}</div>
          {formError && <p role="alert" className="text-sm text-bloom">{formError}</p>}
          <button disabled={formSubmitting} className="min-h-11 rounded-full bg-plum px-6 font-semibold text-cream disabled:opacity-60">{formSubmitting ? 'Posting review…' : 'Post verified review'}</button>
          <p className="text-xs text-muted">Only customers with a delivered order can post one verified review per product.</p>
        </form> : <p className="mt-2 max-w-2xl text-sm text-muted">{reviewAccess.authenticated ? 'You can write a verified review once this product has been delivered to you.' : <><Link className="font-semibold text-plum underline underline-offset-4" href={`/account/login?redirect=${encodeURIComponent(`/shop/${product?.id || ''}`)}`}>Sign in</Link> after delivery to rate the product, packaging, and delivery and share customer photos.</>}</p>}
      </section>

      {/* ====== CUSTOMER PHOTO GALLERY ====== */}
      <div className="mt-14">
        <div className="flex items-center justify-between gap-2 mb-4">
          <h3 className="font-display text-xl text-plum">Customer Photos</h3>
          {allCustomerPhotos.length > 5 && (
            <button
              onClick={() => openLightbox(allCustomerPhotos.map(p => p.src), 0)}
              className="text-sm font-semibold text-bloom hover:text-plum transition underline underline-offset-4"
              aria-label={`View all ${allCustomerPhotos.length} customer photos`}
            >
              View All Photos
            </button>
          )}
        </div>

        {allCustomerPhotos.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-sand bg-ivory/40 p-8 text-center">
            <Camera className="mx-auto h-8 w-8 text-sand" aria-hidden="true" />
            <p className="mt-2 text-sm text-muted">No customer photos yet. Be the first to share how this creation looks!</p>
          </div>
        ) : allCustomerPhotos.length <= 5 ? (
          /* Compact equal-width grid when 5 or fewer photos */
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
            {allCustomerPhotos.map((photo, i) => (
              <button
                key={`${photo.reviewName}-${i}`}
                type="button"
                onClick={() => openLightbox(allCustomerPhotos.map(p => p.src), i)}
                className="group relative aspect-square overflow-hidden rounded-2xl bg-sand focus:outline-none focus:ring-2 focus:ring-bloom/40"
                aria-label={`View customer photo by ${photo.reviewName}`}
              >
                <img
                  src={getOptimizedImageUrl(photo.src, { width: 420, quality: 80 })}
                  alt={`Customer photo by ${photo.reviewName}`}
                  className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
                  loading="lazy"
                />
              </button>
            ))}
          </div>
        ) : (
          /* Premium collage: large featured + 2×2 grid + +N overlay */
          <div className="flex flex-col gap-2 lg:flex-row">
            {/* Large featured photo — left column */}
            <button
              type="button"
              onClick={() => openLightbox(allCustomerPhotos.map(p => p.src), 0)}
              className="group relative w-full aspect-[4/3] lg:aspect-auto lg:w-1/2 lg:h-80 overflow-hidden rounded-2xl bg-sand focus:outline-none focus:ring-2 focus:ring-bloom/40"
              aria-label={`View customer photo by ${allCustomerPhotos[0].reviewName}`}
            >
              <img
                src={allCustomerPhotos[0].src}
                alt={`Customer photo by ${allCustomerPhotos[0].reviewName}`}
                className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
                loading="lazy"
              />
              <span className="absolute bottom-2 left-2 rounded-full bg-plum/70 px-2 py-0.5 text-[10px] font-semibold text-cream backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-opacity">
                {allCustomerPhotos[0].reviewName}
              </span>
            </button>

            {/* Right column: 2×2 grid */}
            <div className="w-full lg:w-1/2 grid grid-cols-2 gap-2">
              {[1, 2, 3, 4].map((i) => {
                const photo = allCustomerPhotos[i]
                if (!photo) return null
                const isLastVisible = i === 4
                const remaining = allCustomerPhotos.length - 5
                return (
                  <button
                    key={`${photo.reviewName}-${i}`}
                    type="button"
                    onClick={() =>
                      openLightbox(
                        allCustomerPhotos.map((p) => p.src),
                        i
                      )
                    }
                    className="group relative aspect-square overflow-hidden rounded-2xl bg-sand focus:outline-none focus:ring-2 focus:ring-bloom/40"
                    aria-label={
                      isLastVisible && remaining > 0
                        ? `View ${remaining} more customer photos`
                        : `View customer photo by ${photo.reviewName}`
                    }
                  >
                    <img
                      src={photo.src}
                      alt={`Customer photo by ${photo.reviewName}`}
                      className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
                      loading="lazy"
                    />
                    {isLastVisible && remaining > 0 && (
                      <div className="absolute inset-0 flex items-center justify-center bg-plum/40 backdrop-blur-[1px] transition-colors group-hover:bg-plum/50">
                        <span className="font-display text-2xl text-cream drop-shadow-sm">
                          +{remaining}
                        </span>
                      </div>
                    )}
                  </button>
                )
              })}
            </div>
          </div>
        )}
      </div>

      {/* ====== SORT + FILTER ====== */}
      <div className="mt-10 flex flex-wrap items-center gap-3">
        <div className="inline-flex items-center gap-2 rounded-full bg-ivory ring-1 ring-sand px-3 py-2 text-sm">
          <Filter className="h-3.5 w-3.5 text-muted" aria-hidden="true" />
          <label htmlFor="rev-sort" className="text-xs font-semibold text-muted">Sort</label>
          <Select
            value={sortBy}
            onChange={setSortBy}
            options={[
              { value: 'newest', label: 'Most Recent' },
              { value: 'highest', label: 'Highest Rated' },
              { value: 'lowest', label: 'Lowest Rated' },
              { value: 'helpful', label: 'Most Helpful' },
            ]}
            className="!min-w-[10rem]"
            aria-label="Sort reviews"
          />
        </div>

        <div className="flex flex-wrap gap-1.5">
          {[0, 5, 4, 3, 2, 1].map((star) => {
            const label = star === 0 ? 'All' : `${star} ★`
            const active = filterStars === star
            return (
              <button
                key={star}
                type="button"
                onClick={() => setFilterStars(active ? 0 : star)}
                className={cn(
                  'rounded-full px-3 py-1.5 text-xs font-semibold transition',
                  active
                    ? 'bg-plum text-cream shadow-soft'
                    : 'bg-ivory text-muted ring-1 ring-sand hover:text-plum hover:ring-bloom/30'
                )}
                aria-pressed={active}
              >
                {label}
              </button>
            )
          })}
        </div>
      </div>

      {/* ====== REVIEW LIST ====== */}
      <div className="mt-8 space-y-6">
        {sorted.length === 0 ? (
          <div className="rounded-3xl bg-ivory/50 p-8 text-center">
            <p className="text-muted">{reviews.length ? 'No reviews match the current filters. Try changing the filter.' : 'No verified customer reviews yet. Customers can review the product, packaging, and delivery after the order arrives.'}</p>
            {reviews.length > 0 && <button
              onClick={() => { setFilterStars(0); setSortBy('newest') }}
              className="mt-3 text-sm font-semibold text-bloom hover:text-plum underline underline-offset-4"
            >
              Clear filters
            </button>}
          </div>
        ) : (
          sorted.map((review) => (
            <article key={review.id} className="paper-card p-6 md:p-8">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h4 className="font-display text-lg text-plum">{review.name}</h4>
                    {review.verifiedPurchase && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-bloom/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-bloom">
                        <Check className="h-3 w-3" /> Verified Purchase
                      </span>
                    )}
                  </div>
                  <div className="mt-0.5 flex items-center gap-2 text-xs text-muted">
                    <StarRating rating={review.rating} size="sm" />
                    <span aria-hidden="true">·</span>
                    <time dateTime={review.date}>{new Date(review.date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</time>
                  </div>
                  {review.productRating && <p className="mt-2 text-xs text-muted">Product {review.productRating}/5 · Packaging {review.packagingRating}/5 · Delivery {review.deliveryRating}/5</p>}
                </div>
                <div className="text-xs text-muted whitespace-nowrap">{review.place || 'Verified'}</div>
              </div>

              {review.title && (
                <h5 className="mt-3 font-display text-base text-plum">{review.title}</h5>
              )}

              <blockquote className="mt-3 leading-relaxed text-muted max-w-prose">"{review.text}"</blockquote>

              {/* Photos */}
              {review.photos && review.photos.length > 0 && (
                <div className="mt-4 flex gap-2 flex-wrap">
                  {review.photos.map((photo, pi) => (
                    <button
                      key={pi}
                      type="button"
                      onClick={() => openLightbox(review.photos, pi)}
                      className="h-20 w-20 overflow-hidden rounded-xl ring-1 ring-sand hover:ring-bloom/40 transition focus:outline-none focus:ring-2 focus:ring-bloom/40 shrink-0"
                      aria-label={`View full photo ${pi + 1} from review by ${review.name}`}
                    >
                      <img src={getOptimizedImageUrl(photo, { width: 480, quality: 80 })} alt={`Review photo by ${review.name}`} className="h-full w-full object-cover hover:scale-105 transition-transform duration-300" loading="lazy" />
                    </button>
                  ))}
                </div>
              )}

              <div className="mt-5 flex items-center gap-4 text-sm">
                <button
                  onClick={() => handleHelpful(review.id)}
                  className={cn(
                    'inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition shadow-soft',
                    helpful[review.id]
                      ? 'bg-bloom/15 text-bloom ring-1 ring-bloom/20'
                      : 'bg-ivory text-muted ring-1 ring-sand hover:text-plum hover:ring-bloom/30'
                  )}
                  aria-label={`Mark review by ${review.name} as helpful`}
                  aria-pressed={!!helpful[review.id]}
                >
                  <ThumbsUp className={cn('h-3.5 w-3.5', helpful[review.id] && 'fill-bloom')} aria-hidden="true" />
                  Helpful {review.helpful + (helpful[review.id] ? 1 : 0)}
                </button>
              </div>
            </article>
          ))
        )}
      </div>

      {/* ====== LIGHTBOX ====== */}
      {lightbox.open && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-plum/20 backdrop-blur-sm p-4"
          role="dialog"
          aria-modal="true"
          aria-label="Customer photo viewer"
          onClick={closeLightbox}
        >
          <button
            type="button"
            onClick={closeLightbox}
            aria-label="Close photo viewer"
            className="absolute top-5 right-5 rounded-full bg-cream/90 p-2.5 text-plum shadow-md hover:bg-cream transition z-10"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>

          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); prevImg() }}
            aria-label="Previous photo"
            className="absolute left-4 sm:left-8 top-1/2 -translate-y-1/2 rounded-full bg-cream/90 p-3 text-plum shadow-md hover:bg-cream transition z-10"
          >
            <ChevronLeft className="h-6 w-6" aria-hidden="true" />
          </button>

          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); nextImg() }}
            aria-label="Next photo"
            className="absolute right-4 sm:right-8 top-1/2 -translate-y-1/2 rounded-full bg-cream/90 p-3 text-plum shadow-md hover:bg-cream transition z-10"
          >
            <ChevronRight className="h-6 w-6" aria-hidden="true" />
          </button>

          <img
            src={lightbox.images[lightbox.index]}
            alt="Customer photo"
            className="max-h-[82vh] max-w-[90vw] rounded-2xl shadow-2xl object-contain"
            onClick={(e) => e.stopPropagation()}
          />

          {lightbox.images.length > 1 && (
            <div className="absolute bottom-5 left-1/2 -translate-x-1/2 rounded-full bg-plum/70 px-4 py-1 text-xs font-semibold text-cream backdrop-blur-sm">
              {lightbox.index + 1} / {lightbox.images.length}
            </div>
          )}
        </div>
      )}
    </section>
  )
}

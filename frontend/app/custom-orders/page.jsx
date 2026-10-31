'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { CheckCircle2, X, ImagePlus } from 'lucide-react'
import { shopCategories } from '@/data/categories'
import PageHeader from '@/components/layout/PageHeader'
import Button from '@/components/ui/Button'
import CraftIllustration from '@/components/ui/CraftIllustration'
import ScrollReveal from '@/components/ui/ScrollReveal'
import Select from '@/components/ui/Select'

const initial = {
  name: '',
  contact: '',
  idea: '',
  category: '',
  colors: '',
  budget: '',
  occasion: '',
  details: '',
}

const budgets = ['Under ₹500', '₹500 – ₹1,500', '₹1,500 – ₹3,000', '₹3,000+', "Let's decide together"]

export default function CustomOrders() {
  const [form, setForm] = useState(initial)
  const [errors, setErrors] = useState({})
  const [submitted, setSubmitted] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState('')
  const [referenceImages, setReferenceImages] = useState([])
  const [uploadingImages, setUploadingImages] = useState(false)
  const [customer, setCustomer] = useState(null)
  const [authLoading, setAuthLoading] = useState(true)
  const [siteInfo, setSiteInfo] = useState(null)

  useEffect(() => {
    let active = true
    fetch('/api/site', { cache: 'no-store' })
      .then((r) => r.json())
      .then((res) => {
        if (active && res?.success && res.data) {
          setSiteInfo(res.data)
        }
      })
      .catch(() => {})
    return () => { active = false }
  }, [])

  useEffect(() => {
    fetch('/api/auth/me', { cache: 'no-store' })
      .then((response) => response.json())
      .then((result) => {
        const signedInCustomer = result.success && result.data?.role === 'CUSTOMER' ? result.data : null
        setCustomer(signedInCustomer)
        if (signedInCustomer) setForm((current) => ({ ...current, name: current.name || signedInCustomer.name || '', contact: signedInCustomer.email }))
      })
      .catch(() => setCustomer(null))
      .finally(() => setAuthLoading(false))
  }, [])

  const setField = (key, value) => {
    setForm((f) => ({ ...f, [key]: value }))
    setErrors((e) => ({ ...e, [key]: undefined }))
  }

  const validate = () => {
    const next = {}
    if (form.name.trim().length < 2 || form.name.trim().length > 100) next.name = 'Enter a name between 2 and 100 characters.'
    if (!customer?.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customer.email)) next.contact = 'Sign in with a valid email address so we can send you updates.'
    if (form.idea.trim().length < 3 || form.idea.trim().length > 120) next.idea = 'Describe your idea in 3 to 120 characters.'
    if (!form.category) next.category = 'Pick the closest category.'
    if (form.budget && !budgets.includes(form.budget)) next.budget = 'Choose one of the listed budget ranges.'
    if (form.colors.trim().length > 100) next.colors = 'Keep colour preferences under 100 characters.'
    if (form.occasion.trim().length > 100) next.occasion = 'Keep the occasion under 100 characters.'
    if (form.details.trim().length < 10 || form.details.trim().length > 1200) next.details = 'Add 10 to 1,200 characters of detail.'
    if (uploadingImages) next.referenceImages = 'Wait for the reference photos to finish uploading.'
    return next
  }

  const uploadReferenceImages = async (files) => {
    const selected = [...(files || [])]
    if (!selected.length) return
    setErrors((current) => ({ ...current, referenceImages: undefined }))
    if (referenceImages.length + selected.length > 3) {
      setErrors((current) => ({ ...current, referenceImages: 'You can attach up to 3 reference photos.' }))
      return
    }
    const invalid = selected.find((file) => !['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size > 4 * 1024 * 1024)
    if (invalid) {
      setErrors((current) => ({ ...current, referenceImages: 'Choose JPEG, PNG, or WebP images, each no larger than 4 MB.' }))
      return
    }
    setUploadingImages(true)
    try {
      const uploads = await Promise.allSettled(selected.map(async (file) => {
        const data = new FormData(); data.append('file', file)
        const response = await fetch('/api/custom-requests/upload', { method: 'POST', body: data })
        const result = await response.json().catch(() => ({}))
        if (!response.ok || !result.success) throw new Error(result.error || `Could not upload ${file.name}.`)
        return { url: result.url, name: file.name }
      }))
      const successful = uploads.filter((result) => result.status === 'fulfilled').map((result) => result.value)
      if (successful.length) setReferenceImages((current) => [...current, ...successful])
      const failed = uploads.find((result) => result.status === 'rejected')
      if (failed) setErrors((current) => ({ ...current, referenceImages: failed.reason?.message || 'One or more reference photos could not be uploaded.' }))
    } catch (error) {
      setErrors((current) => ({ ...current, referenceImages: error.message || 'A reference photo could not be uploaded. Please try again.' }))
    } finally {
      setUploadingImages(false)
    }
  }

  const onSubmit = async (e) => {
    e.preventDefault()
    const next = validate()
    setErrors(next)
    if (Object.keys(next).length) return
    setSubmitting(true)
    setSubmitError('')
    try {
      const response = await fetch('/api/custom-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, name: form.name.trim(), contact: customer.email, idea: form.idea.trim(), details: form.details.trim(), referenceImages: referenceImages.map((image) => image.url) }),
      })
      const result = await response.json().catch(() => ({}))
      if (!response.ok || !result.success) {
        if (result.errors && typeof result.errors === 'object') setErrors((current) => ({ ...current, ...result.errors }))
        if (response.status === 401) throw new Error('Your sign-in expired. Sign in again before sending this request.')
        throw new Error(result.error || 'Please review the highlighted fields and try again.')
      }
      setSubmitted(true)
    } catch (error) {
      setSubmitError(error.message || 'Network error. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  if (submitted) {
    return (
      <div className="container-page py-20">
        <div className="paper-card mx-auto max-w-xl px-8 py-14 text-center">
          <CheckCircle2 className="mx-auto h-12 w-12 text-moss" aria-hidden="true" />
          <h1 className="heading-display mt-4 text-4xl">We received your idea</h1>
          <p className="mt-4 text-muted">
            Thank you, {form.name}. Your custom request has been saved. We’ll use {customer?.email} for any decision and price updates.
          </p>
          <Button className="mt-8" onClick={() => { setSubmitted(false); setForm(initial); setReferenceImages([]); setErrors({}) }}>
            Send another idea
          </Button>
        </div>
      </div>
    )
  }

  return (
    <>
      <PageHeader
        eyebrow="Made to order"
        title="Your idea, our yarn, a little bit of magic."
        description="Custom pieces are how Jamae's Craftopia began — a colour you love, a character from a story, a gift that could not come from a shelf."
      />

      <section className="container-page grid gap-8 pb-8 lg:grid-cols-3">
          {['Share a sketch or a feeling', 'We plan the stitches with you', 'A one-of-a-kind piece arrives'].map(
            (text, i) => (
              <ScrollReveal key={text} delay={i * 0.07}>
                <div className="paper-card p-6">
                  <p className="font-display text-3xl text-petal">0{i + 1}</p>
                  <p className="mt-2 font-display text-xl text-plum">{text}</p>
                </div>
              </ScrollReveal>
            ),
          )}
        </section>

        <section className="container-page grid gap-4 pb-12 sm:grid-cols-3">
          <div className="overflow-hidden rounded-3xl paper-card">
            <div className="aspect-[4/3]">
              {siteInfo?.images?.customOrdersPage?.card1 ? (
                <img
                  src={siteInfo.images.customOrdersPage.card1}
                  alt="Custom crochet teddy piece"
                  className="h-full w-full object-cover"
                />
              ) : (
                <CraftIllustration visual="teddy" className="h-full" palette={['#E8C9A8', '#F3D5D0', '#4A342C']} />
              )}
            </div>
          </div>
          <div className="overflow-hidden rounded-3xl paper-card">
            <div className="aspect-[4/3]">
              {siteInfo?.images?.customOrdersPage?.card2 ? (
                <img
                  src={siteInfo.images.customOrdersPage.card2}
                  alt="Custom crochet floral bouquet"
                  className="h-full w-full object-cover"
                />
              ) : (
                <CraftIllustration visual="bouquet" className="h-full" palette={['#F3C9B8', '#E8B4B8', '#F7EFE6']} />
              )}
            </div>
          </div>
          <div className="overflow-hidden rounded-3xl paper-card">
            <div className="aspect-[4/3]">
              {siteInfo?.images?.customOrdersPage?.card3 ? (
                <img
                  src={siteInfo.images.customOrdersPage.card3}
                  alt="Custom crochet wrapped gift"
                  className="h-full w-full object-cover"
                />
              ) : (
                <CraftIllustration visual="gift" className="h-full" palette={['#D9CDE8', '#E8B4B8']} />
              )}
            </div>
          </div>
        </section>

        <section className="container-page pb-20">
          {authLoading ? <p className="paper-card mx-auto max-w-2xl p-8 text-center text-muted" role="status">Checking your sign-in…</p> : !customer ? <div className="paper-card mx-auto max-w-xl px-6 py-10 text-center sm:px-10"><h2 className="heading-display text-3xl">Sign in to send a custom request</h2><p className="mt-3 text-muted">We’ll save your idea to your account and email you when it’s reviewed or a price is ready.</p><div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row"><Link href={`/account/login?redirect=${encodeURIComponent('/custom-orders')}`} className="inline-flex min-h-11 items-center justify-center rounded-full bg-plum px-6 font-semibold text-cream">Sign in</Link><Link href={`/account/signup?redirect=${encodeURIComponent('/custom-orders')}`} className="inline-flex min-h-11 items-center justify-center rounded-full border border-sand px-6 font-semibold text-plum">Create an account</Link></div></div> : <form onSubmit={onSubmit} className="paper-card mx-auto max-w-2xl p-6 sm:p-10" noValidate>
            <h2 className="heading-display text-3xl">Tell us what to make</h2>
            <p className="mt-2 text-muted">Name, idea, category, and special request are required. Colours, budget, occasion, and photos are optional. We’ll send updates to your signed-in email.</p>

            <div className="mt-8 grid gap-5 sm:grid-cols-2">
              <Field label="Name" error={errors.name}>
                <input
                  value={form.name}
                  onChange={(e) => setField('name', e.target.value)}
                  autoComplete="name"
                  required maxLength={100} aria-invalid={!!errors.name} className={inputClass(errors.name)}
                />
              </Field>
              <Field label="Email for updates" error={errors.contact}>
                <input type="email" value={customer.email} readOnly aria-label="Email for request updates" className={`${inputClass(errors.contact)} bg-ink/5`} />
              </Field>
              <Field label="What would you like to create?" className="sm:col-span-2" error={errors.idea}>
                <input
                  value={form.idea}
                  onChange={(e) => setField('idea', e.target.value)}
                  placeholder="A peach bouquet, a bunny with a name tag…"
                  required maxLength={120} aria-invalid={!!errors.idea}
                  className={inputClass(errors.idea)}
                />
              </Field>
              <Field label="Category" error={errors.category}>
                <Select
                  value={form.category}
                  onChange={(v) => setField('category', v)}
                  options={[
                    { value: '', label: 'Choose one' },
                    ...shopCategories.map((c) => ({ value: c.id, label: c.name })),
                  ]}
                  error={!!errors.category}
                />
              </Field>
              <Field label="Preferred colours" error={errors.colors}>
                <input
                  value={form.colors}
                  onChange={(e) => setField('colors', e.target.value)}
                  placeholder="Blush, sage, cream…"
                  maxLength={100} aria-invalid={!!errors.colors}
                  className={inputClass()}
                />
              </Field>
              <Field label="Budget range" error={errors.budget}>
                <Select
                  value={form.budget}
                  onChange={(v) => setField('budget', v)}
                  options={[
                    { value: '', label: 'Optional' },
                    ...budgets.map((b) => ({ value: b, label: b })),
                  ]}
                />
              </Field>
              <Field label="Occasion" error={errors.occasion}>
                <input
                  value={form.occasion}
                  onChange={(e) => setField('occasion', e.target.value)}
                  placeholder="Birthday, wedding, just because"
                  maxLength={100} aria-invalid={!!errors.occasion}
                  className={inputClass()}
                />
              </Field>
              <Field label="Special request" className="sm:col-span-2" error={errors.details}>
                <textarea
                  value={form.details}
                  onChange={(e) => setField('details', e.target.value)}
                  rows={5}
                  required minLength={10} maxLength={1200} aria-invalid={!!errors.details}
                  className={inputClass(errors.details)}
                />
              </Field>
              <div className="sm:col-span-2">
                <div className={`rounded-2xl border border-dashed px-4 py-5 text-center ${errors.referenceImages ? 'border-bloom bg-bloom/5' : 'border-petal bg-blush/20'}`}>
                  <input id="custom-reference-images" type="file" accept="image/jpeg,image/png,image/webp" multiple className="sr-only" disabled={uploadingImages || referenceImages.length >= 3} onChange={(event) => { uploadReferenceImages(event.target.files); event.target.value = '' }} />
                  <label htmlFor="custom-reference-images" className={`inline-flex min-h-11 items-center gap-2 rounded-full px-5 text-sm font-semibold text-cream ${uploadingImages || referenceImages.length >= 3 ? 'cursor-not-allowed bg-plum/50' : 'cursor-pointer bg-plum hover:bg-plum/90'}`}><ImagePlus className="h-4 w-4" aria-hidden="true" />{uploadingImages ? 'Uploading photos…' : 'Add reference photos'}</label>
                  <p className="mt-2 text-xs text-muted">Optional · Up to 3 JPEG, PNG, or WebP images · 4 MB each</p>
                  {errors.referenceImages && <p role="alert" className="mt-2 text-sm text-bloom">{errors.referenceImages}</p>}
                </div>
                {referenceImages.length > 0 && <div className="mt-3 grid grid-cols-3 gap-2">{referenceImages.map((image) => <div key={image.url} className="relative aspect-square overflow-hidden rounded-xl border border-sand bg-white"><img src={image.url} alt={`Reference photo: ${image.name}`} className="h-full w-full object-cover" /><button type="button" aria-label={`Remove ${image.name}`} onClick={() => setReferenceImages((current) => current.filter((item) => item.url !== image.url))} className="absolute right-1 top-1 rounded-full bg-white p-1.5 text-plum shadow"><X className="h-4 w-4" /></button><p className="absolute inset-x-0 bottom-0 truncate bg-ink/70 px-2 py-1 text-left text-[10px] text-white">{image.name}</p></div>)}</div>}
              </div>
            </div>

            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <Button type="submit" className="flex-1" disabled={submitting || uploadingImages}>
                {submitting ? 'Sending…' : 'Send my custom request'}
              </Button>
            </div>
            {submitError ? <p role="alert" className="mt-4 text-sm font-medium text-bloom">{submitError}</p> : null}
          </form>}
    </section>
    </>
  )
}

function Field({ label, error, className = '', children }) {
  return (
    <label className={`block ${className}`}>
      <span className="mb-1.5 block text-sm font-semibold text-plum">{label}</span>
      {children}
      {error ? <span className="mt-1 block text-sm text-bloom">{error}</span> : null}
    </label>
  )
}

function inputClass(error) {
  return `w-full rounded-2xl border bg-cream px-4 py-3 text-ink outline-none transition focus:ring-2 focus:ring-bloom/30 ${
    error ? 'border-bloom' : 'border-sand'
  }`
}

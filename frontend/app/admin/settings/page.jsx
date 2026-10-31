'use client'

import { useEffect, useRef, useState } from 'react'
import {
  MapPin, Phone, Mail, MessageCircle,
  CreditCard, Store, Check, ExternalLink, Globe, Sparkles,
  Upload, ImageIcon, Image as ImageLucide, BookOpen
} from 'lucide-react'
import { InstagramIcon, FacebookIcon } from '@/components/ui/SocialIcons'
import { useAdminAccess } from '../access-context'
import AboutTab from './AboutTab'

function VisibilityBadge({ isVisible, onToggle, disabled }) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() => onToggle(!isVisible)}
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-semibold transition ${
        isVisible
          ? 'bg-moss/10 text-moss ring-1 ring-moss/30 hover:bg-moss/20'
          : 'bg-muted/15 text-muted ring-1 ring-sand hover:bg-sand/40'
      } disabled:opacity-50`}
      title={isVisible ? 'Click to hide from website' : 'Click to show on website'}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${isVisible ? 'bg-moss' : 'bg-muted'}`} />
      <span>{isVisible ? 'Visible on site' : 'Hidden from site'}</span>
    </button>
  )
}

function ImageField({
  label,
  description,
  value,
  onChange,
  disabled = false,
}) {
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState('')
  const fileInputRef = useRef(null)

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    setUploadError('')
    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('folder', 'jamaes-craftopia/storefront')
      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      })
      const data = await res.json()
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to upload photo')
      }
      onChange(data.url)
    } catch (err) {
      setUploadError(err.message || 'Upload failed')
    } finally {
      setUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  return (
    <div className="flex flex-col h-full rounded-2xl border border-sand/80 bg-white p-3.5 sm:p-4 shadow-sm transition hover:shadow-soft min-w-0 w-full overflow-hidden">
      {/* Header */}
      <div className="mb-2 min-w-0">
        <label className="block text-xs font-bold text-plum uppercase tracking-wider truncate" title={label}>
          {label}
        </label>
        {description && (
          <p className="mt-0.5 text-[11px] text-muted line-clamp-2" title={description}>
            {description}
          </p>
        )}
      </div>

      {/* Visual / Image Preview Area */}
      <div className="relative w-full aspect-[16/10] sm:aspect-video overflow-hidden rounded-xl border border-sand bg-ivory/60 flex items-center justify-center mb-3 group shrink-0">
        {value ? (
          <>
            <img src={value} alt={label} className="h-full w-full object-cover transition group-hover:scale-105 duration-300" />
            <div className="absolute inset-0 bg-plum/20 opacity-0 group-hover:opacity-100 transition flex items-center justify-center gap-2">
              <button
                type="button"
                disabled={disabled || uploading}
                onClick={() => fileInputRef.current?.click()}
                className="rounded-full bg-white/95 px-3 py-1.5 text-[11px] font-semibold text-plum shadow-md hover:bg-white"
              >
                Change photo
              </button>
            </div>
          </>
        ) : (
          <div className="flex flex-col items-center justify-center text-muted/70 text-xs text-center p-3">
            <div className="h-8 w-8 rounded-full bg-plum/5 flex items-center justify-center mb-1 text-bloom">
              <ImageIcon className="h-4 w-4" />
            </div>
            <span className="font-medium text-[11px] text-plum/70">Default Brand Art</span>
            <span className="text-[10px] text-muted mt-0.5">Will display brand SVG</span>
          </div>
        )}

        {/* Uploading overlay */}
        {uploading && (
          <div className="absolute inset-0 bg-plum/70 backdrop-blur-xs flex items-center justify-center z-10">
            <div className="flex items-center gap-2 text-cream text-xs font-semibold">
              <div className="h-4 w-4 border-2 border-cream/30 border-t-cream rounded-full animate-spin" />
              <span>Uploading…</span>
            </div>
          </div>
        )}
      </div>

      {/* Action Buttons & URL Input */}
      <div className="mt-auto space-y-2 min-w-0 w-full">
        <input
          type="file"
          ref={fileInputRef}
          accept="image/jpeg,image/png,image/webp"
          className="hidden"
          onChange={handleFileChange}
          disabled={disabled || uploading}
        />

        <div className="flex items-center gap-2 min-w-0 w-full">
          <button
            type="button"
            disabled={disabled || uploading}
            onClick={() => fileInputRef.current?.click()}
            className="flex-1 min-w-0 inline-flex items-center justify-center gap-1.5 rounded-xl bg-plum/10 hover:bg-plum/20 px-3 py-2 text-xs font-semibold text-plum transition disabled:opacity-50"
          >
            <Upload className="h-3.5 w-3.5 text-bloom shrink-0" />
            <span className="truncate">{uploading ? 'Uploading…' : value ? 'Replace Photo' : 'Upload Photo'}</span>
          </button>

          {value && (
            <button
              type="button"
              disabled={disabled}
              onClick={() => onChange('')}
              className="shrink-0 rounded-xl border border-sand bg-white px-2.5 py-2 text-xs font-semibold text-muted hover:text-bloom hover:bg-blush/40 transition"
              title="Reset to default illustration"
            >
              Clear
            </button>
          )}
        </div>

        {/* Direct URL input */}
        <div className="min-w-0 w-full">
          <input
            type="url"
            readOnly={disabled}
            value={value || ''}
            onChange={(e) => onChange(e.target.value)}
            placeholder="Or paste direct image URL (https://…)"
            className="w-full min-w-0 rounded-xl border border-sand/80 bg-sand/20 px-2.5 py-1.5 text-[11px] text-plum placeholder:text-muted/60 read-only:bg-ink/5 focus:border-bloom focus:bg-white focus:outline-none transition"
          />
        </div>

        {uploadError && <p className="text-[11px] text-bloom font-medium break-words">{uploadError}</p>}
      </div>
    </div>
  )
}

export default function AdminSettings() {
  const { can } = useAdminAccess()
  const canManage = can('settings.manage')

  const [activeTab, setActiveTab] = useState('contact') // 'contact' | 'about' | 'images' | 'payment'

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const tab = new URLSearchParams(window.location.search).get('tab')
      if (['contact', 'about', 'images', 'payment'].includes(tab)) {
        setActiveTab(tab)
      }
    }
  }, [])

  const handleTabChange = (tabId) => {
    setActiveTab(tabId)
    setError('')
    setNotice('')
    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href)
      url.searchParams.set('tab', tabId)
      window.history.replaceState(null, '', url.toString())
    }
  }

  // Contact & Social form state
  const [siteForm, setSiteForm] = useState({
    name: "Jamae's Craftopia",
    tagline: 'Handmade with love, created especially for you.',
    location: 'Siliguri, West Bengal, India',
    email: 'hello@jamaescraftopia.com',
    phone: '+91 98XXX XXXXX',
    whatsapp: 'https://wa.me/910000000000',
    social: {
      instagram: 'https://instagram.com/',
      facebook: 'https://facebook.com/',
    },
    visibility: {
      location: true,
      email: true,
      phone: true,
      whatsapp: true,
      instagram: true,
      facebook: true,
    },
    images: {
      hero: { top: '', bottomLeft: '', bottomRight: '' },
      brandStory: { left: '', topRight: '', bottomRight: '' },
      customOrderCta: { banner: '' },
      craftTable: [
        { id: 1, image: '', visual: 'yarn', tall: false },
        { id: 2, image: '', visual: 'teddy', tall: true },
        { id: 3, image: '', visual: 'flower', tall: false },
        { id: 4, image: '', visual: 'bouquet', tall: false },
        { id: 5, image: '', visual: 'tote', tall: true },
        { id: 6, image: '', visual: 'blanket', tall: false },
        { id: 7, image: '', visual: 'gift', tall: false },
        { id: 8, image: '', visual: 'heart', tall: false },
      ],
      customOrdersPage: { card1: '', card2: '', card3: '' },
    },
  })

  // Payment form state
  const [paymentForm, setPaymentForm] = useState({
    merchantVpa: '',
    merchantName: "Jamae's Craftopia",
    whatsappNumber: '',
  })

  const [siteLoading, setSiteLoading] = useState(true)
  const [paymentLoading, setPaymentLoading] = useState(true)
  const [siteSaving, setSiteSaving] = useState(false)
  const [paymentSaving, setPaymentSaving] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  // Load site contact & social & images settings
  useEffect(() => {
    let active = true
    fetch('/api/admin/site', { cache: 'no-store' })
      .then(async (res) => {
        const json = await res.json()
        if (active && json.success && json.data) {
          setSiteForm((prev) => ({
            ...prev,
            ...json.data,
            social: { ...prev.social, ...(json.data.social || {}) },
            visibility: { ...prev.visibility, ...(json.data.visibility || {}) },
            images: {
              ...prev.images,
              ...(json.data.images || {}),
              hero: { ...prev.images.hero, ...(json.data.images?.hero || {}) },
              brandStory: { ...prev.images.brandStory, ...(json.data.images?.brandStory || {}) },
              customOrderCta: { ...prev.images.customOrderCta, ...(json.data.images?.customOrderCta || {}) },
              customOrdersPage: { ...prev.images.customOrdersPage, ...(json.data.images?.customOrdersPage || {}) },
              craftTable: Array.isArray(json.data.images?.craftTable) && json.data.images.craftTable.length
                ? json.data.images.craftTable
                : prev.images.craftTable,
            },
          }))
        }
      })
      .catch(() => {})
      .finally(() => {
        if (active) setSiteLoading(false)
      })
    return () => { active = false }
  }, [])

  // Load payment settings
  useEffect(() => {
    let active = true
    fetch('/api/admin/settings', { cache: 'no-store' })
      .then(async (response) => {
        const result = await response.json()
        if (active && response.ok && result.success && result.data) {
          setPaymentForm({
            merchantVpa: result.data.merchantVpa || '',
            merchantName: result.data.merchantName || "Jamae's Craftopia",
            whatsappNumber: result.data.whatsappNumber || '',
          })
        }
      })
      .catch(() => {})
      .finally(() => {
        if (active) setPaymentLoading(false)
      })
    return () => { active = false }
  }, [])

  async function saveSite(e) {
    if (e) e.preventDefault()
    setError('')
    setNotice('')
    setSiteSaving(true)
    try {
      const res = await fetch('/api/admin/site', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(siteForm),
      })
      const json = await res.json()
      if (!res.ok || !json.success) throw new Error(json.error || 'Failed to save site settings.')
      setNotice('Store settings and storefront images updated! The changes are now live across the website without requiring any code deploy.')
    } catch (err) {
      setError(err.message || 'Could not save settings.')
    } finally {
      setSiteSaving(false)
    }
  }

  async function savePayment(e) {
    e.preventDefault()
    setError('')
    setNotice('')
    setPaymentSaving(true)
    try {
      const response = await fetch('/api/admin/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(paymentForm),
      })
      const result = await response.json()
      if (!response.ok || !result.success) throw new Error(result.error || 'Could not save payment settings.')
      setNotice('Payment settings saved. UPI details are now updated for checkout.')
    } catch (e) {
      setError(e.message)
    } finally {
      setPaymentSaving(false)
    }
  }

  return (
    <div className="max-w-5xl space-y-6">
      {/* Header */}
      <header className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-3xl text-plum">Store & Settings</h1>
          <p className="mt-1 text-sm text-muted">
            Manage contact information, social channels, About page story & makers, storefront visuals, and payment destinations.
          </p>
        </div>
      </header>

      {/* Tabs */}
      <div className="flex border-b border-sand gap-1 sm:gap-2 overflow-x-auto pb-0.5 scrollbar-none">
        <button
          type="button"
          onClick={() => handleTabChange('contact')}
          className={`inline-flex items-center gap-2 border-b-2 px-3 sm:px-4 py-3 text-xs sm:text-sm font-semibold transition shrink-0 ${
            activeTab === 'contact'
              ? 'border-plum text-plum'
              : 'border-transparent text-muted hover:text-plum'
          }`}
        >
          <Store className="h-4 w-4" />
          <span>Contact & Social</span>
        </button>
        <button
          type="button"
          onClick={() => handleTabChange('about')}
          className={`inline-flex items-center gap-2 border-b-2 px-3 sm:px-4 py-3 text-xs sm:text-sm font-semibold transition shrink-0 ${
            activeTab === 'about'
              ? 'border-plum text-plum'
              : 'border-transparent text-muted hover:text-plum'
          }`}
        >
          <BookOpen className="h-4 w-4" />
          <span>About Page</span>
        </button>
        <button
          type="button"
          onClick={() => handleTabChange('images')}
          className={`inline-flex items-center gap-2 border-b-2 px-3 sm:px-4 py-3 text-xs sm:text-sm font-semibold transition shrink-0 ${
            activeTab === 'images'
              ? 'border-plum text-plum'
              : 'border-transparent text-muted hover:text-plum'
          }`}
        >
          <ImageLucide className="h-4 w-4" />
          <span>Storefront Media & Images</span>
        </button>
        <button
          type="button"
          onClick={() => handleTabChange('payment')}
          className={`inline-flex items-center gap-2 border-b-2 px-3 sm:px-4 py-3 text-xs sm:text-sm font-semibold transition shrink-0 ${
            activeTab === 'payment'
              ? 'border-plum text-plum'
              : 'border-transparent text-muted hover:text-plum'
          }`}
        >
          <CreditCard className="h-4 w-4" />
          <span>Payment & UPI</span>
        </button>
      </div>

      {/* Notifications */}
      {error && (
        <div role="alert" className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
          {error}
        </div>
      )}
      {notice && (
        <div role="status" className="rounded-2xl border border-moss/20 bg-moss/10 p-4 text-sm text-moss font-medium">
          {notice}
        </div>
      )}

      {/* ================= TAB 1: CONTACT & SOCIAL MEDIA ================= */}
      {activeTab === 'contact' && (
        <div className="grid gap-8 lg:grid-cols-5">
          {/* Main Edit Form */}
          <div className="lg:col-span-3">
            {siteLoading ? (
              <p role="status" className="text-sm text-muted">Loading store settings…</p>
            ) : (
              <form onSubmit={saveSite} className="space-y-6 rounded-3xl bg-cream p-6 shadow-soft ring-1 ring-sand">
                {/* Store Identity */}
                <div className="space-y-4">
                  <h2 className="font-display text-lg text-plum flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-bloom" />
                    Store Identity
                  </h2>
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-muted">
                      Store Name
                    </label>
                    <input
                      type="text"
                      required
                      readOnly={!canManage}
                      value={siteForm.name}
                      onChange={(e) => setSiteForm({ ...siteForm, name: e.target.value })}
                      placeholder="Jamae's Craftopia"
                      className="mt-1.5 w-full rounded-xl border border-sand bg-white px-4 py-2.5 text-sm text-plum read-only:bg-ink/5 focus:border-bloom focus:outline-none focus:ring-2 focus:ring-bloom/20"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-muted">
                      Tagline / Footer Note
                    </label>
                    <input
                      type="text"
                      readOnly={!canManage}
                      value={siteForm.tagline}
                      onChange={(e) => setSiteForm({ ...siteForm, tagline: e.target.value })}
                      placeholder="Handmade with love, created especially for you."
                      className="mt-1.5 w-full rounded-xl border border-sand bg-white px-4 py-2.5 text-sm text-plum read-only:bg-ink/5 focus:border-bloom focus:outline-none focus:ring-2 focus:ring-bloom/20"
                    />
                  </div>
                </div>

                <hr className="border-sand/60" />

                {/* Location & Contact */}
                <div className="space-y-4">
                  <h2 className="font-display text-lg text-plum flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-bloom" />
                    Location & Direct Reach
                  </h2>
                  <div>
                    <div className="flex items-center justify-between">
                      <label className="block text-xs font-semibold uppercase tracking-wider text-muted">
                        Workshop Location / City
                      </label>
                      <VisibilityBadge
                        isVisible={siteForm.visibility?.location !== false}
                        disabled={!canManage}
                        onToggle={(val) =>
                          setSiteForm({
                            ...siteForm,
                            visibility: { ...siteForm.visibility, location: val },
                          })
                        }
                      />
                    </div>
                    <input
                      type="text"
                      required
                      readOnly={!canManage}
                      value={siteForm.location}
                      onChange={(e) => setSiteForm({ ...siteForm, location: e.target.value })}
                      placeholder="Siliguri, West Bengal, India"
                      className="mt-1.5 w-full rounded-xl border border-sand bg-white px-4 py-2.5 text-sm text-plum read-only:bg-ink/5 focus:border-bloom focus:outline-none focus:ring-2 focus:ring-bloom/20"
                    />
                    <p className="mt-1 text-xs text-muted">Displayed in the Footer, Contact page, and About page.</p>
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <div className="flex items-center justify-between">
                        <label className="block text-xs font-semibold uppercase tracking-wider text-muted">
                          Mobile / Phone Number
                        </label>
                        <VisibilityBadge
                          isVisible={siteForm.visibility?.phone !== false}
                          disabled={!canManage}
                          onToggle={(val) =>
                            setSiteForm({
                              ...siteForm,
                              visibility: { ...siteForm.visibility, phone: val },
                            })
                          }
                        />
                      </div>
                      <input
                        type="text"
                        readOnly={!canManage}
                        value={siteForm.phone}
                        onChange={(e) => setSiteForm({ ...siteForm, phone: e.target.value })}
                        placeholder="+91 98XXX XXXXX"
                        className="mt-1.5 w-full rounded-xl border border-sand bg-white px-4 py-2.5 text-sm text-plum read-only:bg-ink/5 focus:border-bloom focus:outline-none focus:ring-2 focus:ring-bloom/20"
                      />
                    </div>
                    <div>
                      <div className="flex items-center justify-between">
                        <label className="block text-xs font-semibold uppercase tracking-wider text-muted">
                          Contact Email
                        </label>
                        <VisibilityBadge
                          isVisible={siteForm.visibility?.email !== false}
                          disabled={!canManage}
                          onToggle={(val) =>
                            setSiteForm({
                              ...siteForm,
                              visibility: { ...siteForm.visibility, email: val },
                            })
                          }
                        />
                      </div>
                      <input
                        type="email"
                        readOnly={!canManage}
                        value={siteForm.email}
                        onChange={(e) => setSiteForm({ ...siteForm, email: e.target.value })}
                        placeholder="hello@jamaescraftopia.com"
                        className="mt-1.5 w-full rounded-xl border border-sand bg-white px-4 py-2.5 text-sm text-plum read-only:bg-ink/5 focus:border-bloom focus:outline-none focus:ring-2 focus:ring-bloom/20"
                      />
                    </div>
                  </div>
                  <div>
                    <div className="flex items-center justify-between">
                      <label className="block text-xs font-semibold uppercase tracking-wider text-muted">
                        WhatsApp Chat Link or Number
                      </label>
                      <VisibilityBadge
                        isVisible={siteForm.visibility?.whatsapp !== false}
                        disabled={!canManage}
                        onToggle={(val) =>
                          setSiteForm({
                            ...siteForm,
                            visibility: { ...siteForm.visibility, whatsapp: val },
                          })
                        }
                      />
                    </div>
                    <input
                      type="text"
                      readOnly={!canManage}
                      value={siteForm.whatsapp}
                      onChange={(e) => setSiteForm({ ...siteForm, whatsapp: e.target.value })}
                      placeholder="https://wa.me/919876543210 or 919876543210"
                      className="mt-1.5 w-full rounded-xl border border-sand bg-white px-4 py-2.5 text-sm text-plum read-only:bg-ink/5 focus:border-bloom focus:outline-none focus:ring-2 focus:ring-bloom/20"
                    />
                    <p className="mt-1 text-xs text-muted">Used for the WhatsApp quick chat button on the Contact page.</p>
                  </div>
                </div>

                <hr className="border-sand/60" />

                {/* Social Media Links */}
                <div className="space-y-4">
                  <h2 className="font-display text-lg text-plum flex items-center gap-2">
                    <Globe className="h-4 w-4 text-bloom" />
                    Social Media Channels
                  </h2>
                  <div>
                    <div className="flex items-center justify-between">
                      <label className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted">
                        <InstagramIcon className="h-3.5 w-3.5 text-bloom" />
                        Instagram Profile URL
                      </label>
                      <VisibilityBadge
                        isVisible={siteForm.visibility?.instagram !== false}
                        disabled={!canManage}
                        onToggle={(val) =>
                          setSiteForm({
                            ...siteForm,
                            visibility: { ...siteForm.visibility, instagram: val },
                          })
                        }
                      />
                    </div>
                    <div className="mt-1.5 flex gap-2">
                      <input
                        type="url"
                        readOnly={!canManage}
                        value={siteForm.social?.instagram || ''}
                        onChange={(e) =>
                          setSiteForm({
                            ...siteForm,
                            social: { ...siteForm.social, instagram: e.target.value },
                          })
                        }
                        placeholder="https://instagram.com/jamaescraftopia"
                        className="flex-1 rounded-xl border border-sand bg-white px-4 py-2.5 text-sm text-plum read-only:bg-ink/5 focus:border-bloom focus:outline-none focus:ring-2 focus:ring-bloom/20"
                      />
                      {siteForm.social?.instagram && (
                        <a
                          href={siteForm.social.instagram}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 rounded-xl border border-sand bg-white px-3 py-2 text-xs font-semibold text-plum hover:bg-blush"
                        >
                          <ExternalLink className="h-3.5 w-3.5" />
                          <span>Test</span>
                        </a>
                      )}
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between">
                      <label className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted">
                        <FacebookIcon className="h-3.5 w-3.5 text-bloom" />
                        Facebook Page URL
                      </label>
                      <VisibilityBadge
                        isVisible={siteForm.visibility?.facebook !== false}
                        disabled={!canManage}
                        onToggle={(val) =>
                          setSiteForm({
                            ...siteForm,
                            visibility: { ...siteForm.visibility, facebook: val },
                          })
                        }
                      />
                    </div>
                    <div className="mt-1.5 flex gap-2">
                      <input
                        type="url"
                        readOnly={!canManage}
                        value={siteForm.social?.facebook || ''}
                        onChange={(e) =>
                          setSiteForm({
                            ...siteForm,
                            social: { ...siteForm.social, facebook: e.target.value },
                          })
                        }
                        placeholder="https://facebook.com/jamaescraftopia"
                        className="flex-1 rounded-xl border border-sand bg-white px-4 py-2.5 text-sm text-plum read-only:bg-ink/5 focus:border-bloom focus:outline-none focus:ring-2 focus:ring-bloom/20"
                      />
                      {siteForm.social?.facebook && (
                        <a
                          href={siteForm.social.facebook}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 rounded-xl border border-sand bg-white px-3 py-2 text-xs font-semibold text-plum hover:bg-blush"
                        >
                          <ExternalLink className="h-3.5 w-3.5" />
                          <span>Test</span>
                        </a>
                      )}
                    </div>
                  </div>
                </div>

                {canManage && (
                  <div className="pt-2">
                    <button
                      type="submit"
                      disabled={siteSaving}
                      className="rounded-full bg-plum px-6 py-3 font-semibold text-cream shadow-soft transition hover:bg-ink disabled:opacity-60"
                    >
                      {siteSaving ? 'Saving changes…' : 'Save store & contact details'}
                    </button>
                  </div>
                )}
              </form>
            )}
          </div>

          {/* Live Preview Sidebar */}
          <div className="lg:col-span-2 space-y-4">
            <h2 className="text-xs font-semibold uppercase tracking-widest text-muted">
              Live Storefront Preview
            </h2>

            {/* Footer "Find us" Card Preview */}
            <div className="rounded-3xl border border-sand bg-ivory/80 p-5 shadow-soft">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-bloom">
                Footer Widget Preview
              </span>
              <h3 className="mt-2 text-sm font-semibold uppercase tracking-[0.18em] text-plum">
                Find us
              </h3>
              {siteForm.visibility?.location !== false && siteForm.location ? (
                <p className="mt-3 flex items-start gap-2 text-xs text-muted">
                  <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-bloom" />
                  <span>{siteForm.location}</span>
                </p>
              ) : siteForm.location ? (
                <p className="mt-3 text-xs text-muted/50 italic line-through">Location hidden</p>
              ) : null}
              {siteForm.visibility?.email !== false && siteForm.email ? (
                <p className="mt-1 text-xs text-muted">{siteForm.email}</p>
              ) : siteForm.email ? (
                <p className="mt-1 text-xs text-muted/50 italic line-through">Email hidden</p>
              ) : null}
              {siteForm.visibility?.phone !== false && siteForm.phone ? (
                <p className="mt-1 text-xs text-muted">{siteForm.phone}</p>
              ) : siteForm.phone ? (
                <p className="mt-1 text-xs text-muted/50 italic line-through">Phone hidden</p>
              ) : null}
              <div className="mt-3 flex gap-2">
                {siteForm.visibility?.instagram !== false && siteForm.social?.instagram && (
                  <span className="rounded-full bg-cream p-1.5 text-plum ring-1 ring-sand/40" title="Instagram visible">
                    <InstagramIcon className="h-4 w-4" />
                  </span>
                )}
                {siteForm.visibility?.facebook !== false && siteForm.social?.facebook && (
                  <span className="rounded-full bg-cream p-1.5 text-plum ring-1 ring-sand/40" title="Facebook visible">
                    <FacebookIcon className="h-4 w-4" />
                  </span>
                )}
                {siteForm.visibility?.whatsapp !== false && siteForm.whatsapp && (
                  <span className="rounded-full bg-cream p-1.5 text-plum ring-1 ring-sand/40" title="WhatsApp visible">
                    <MessageCircle className="h-4 w-4" />
                  </span>
                )}
              </div>
            </div>

            {/* Contact Page Aside Card Preview */}
            <div className="rounded-3xl border border-sand bg-white p-5 shadow-soft">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-bloom">
                Contact Page Preview
              </span>
              <div className="mt-3 space-y-2 text-xs text-muted">
                {siteForm.visibility?.location !== false && siteForm.location && (
                  <div className="flex items-center gap-2 font-medium text-plum">
                    <MapPin className="h-3.5 w-3.5 text-bloom" />
                    <span>{siteForm.location}</span>
                  </div>
                )}
                {siteForm.visibility?.email !== false && siteForm.email && (
                  <div className="flex items-center gap-2">
                    <Mail className="h-3.5 w-3.5 text-bloom" />
                    <span>{siteForm.email}</span>
                  </div>
                )}
                {siteForm.visibility?.phone !== false && siteForm.phone && (
                  <div className="flex items-center gap-2">
                    <Phone className="h-3.5 w-3.5 text-bloom" />
                    <span>{siteForm.phone}</span>
                  </div>
                )}
                {siteForm.visibility?.whatsapp !== false && siteForm.whatsapp && (
                  <div className="flex items-center gap-2">
                    <MessageCircle className="h-3.5 w-3.5 text-bloom" />
                    <span>WhatsApp: {siteForm.whatsapp}</span>
                  </div>
                )}
              </div>
            </div>

            <div className="rounded-2xl border border-sand/60 bg-cream/50 p-4 text-xs text-muted">
              💡 <strong>Instant effect:</strong> Changes saved here immediately update the website footer, contact cards, and customer links without redeploying code.
            </div>
          </div>
        </div>
      )}

      {/* ================= TAB: ABOUT PAGE ================= */}
      {activeTab === 'about' && (
        <AboutTab />
      )}

      {/* ================= TAB 3: STOREFRONT MEDIA & IMAGES ================= */}
      {activeTab === 'images' && (
        <form onSubmit={saveSite} className="space-y-8 min-w-0">
          {siteLoading ? (
            <p role="status" className="text-sm text-muted">Loading media settings…</p>
          ) : (
            <>
              {/* Section 1: Hero Top Collage */}
              <section className="rounded-3xl border border-sand bg-ivory/60 p-4 sm:p-6 space-y-4 min-w-0 overflow-hidden">
                <div>
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-bloom">Home Page Hero</span>
                  <h2 className="font-display text-xl text-plum mt-0.5">
                    Beside "Handmade with love, created especially for you"
                  </h2>
                  <p className="text-xs text-muted mt-1">
                    Upload photos or paste URLs to customize the 3-image collage next to the main hero heading. Leaving any slot empty uses the brand artwork illustration.
                  </p>
                </div>
                <div className="grid gap-4 grid-cols-1 md:grid-cols-2">
                  <div className="md:col-span-2">
                    <ImageField
                      label="Top Wide Card (Main Hero Showcase)"
                      description="Wide banner photo at the top of the hero collage (16:9 ratio). Default: Teddy bear illustration."
                      value={siteForm.images?.hero?.top}
                      disabled={!canManage}
                      onChange={(url) => setSiteForm({
                        ...siteForm,
                        images: { ...siteForm.images, hero: { ...siteForm.images.hero, top: url } }
                      })}
                    />
                  </div>
                  <ImageField
                    label="Bottom-Left Card"
                    description="Square photo at bottom-left of hero collage. Default: Bouquet illustration."
                    value={siteForm.images?.hero?.bottomLeft}
                    disabled={!canManage}
                    onChange={(url) => setSiteForm({
                      ...siteForm,
                      images: { ...siteForm.images, hero: { ...siteForm.images.hero, bottomLeft: url } }
                    })}
                  />
                  <ImageField
                    label="Bottom-Right Card"
                    description="Square photo at bottom-right of hero collage. Default: Flower illustration."
                    value={siteForm.images?.hero?.bottomRight}
                    disabled={!canManage}
                    onChange={(url) => setSiteForm({
                      ...siteForm,
                      images: { ...siteForm.images, hero: { ...siteForm.images.hero, bottomRight: url } }
                    })}
                  />
                </div>
              </section>

              {/* Section 2: Why Jamae's Craftopia */}
              <section className="rounded-3xl border border-sand bg-ivory/60 p-4 sm:p-6 space-y-4 min-w-0 overflow-hidden">
                <div>
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-bloom">Home Page · Brand Story</span>
                  <h2 className="font-display text-xl text-plum mt-0.5">
                    "Why Jamae's Craftopia" Section Images
                  </h2>
                  <p className="text-xs text-muted mt-1">
                    The 3-image layout beside "Made slowly, lovingly, and especially for you".
                  </p>
                </div>
                <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
                  <ImageField
                    label="Left Tall Card"
                    description="Vertical 3:4 photo. Default: Yarn skein."
                    value={siteForm.images?.brandStory?.left}
                    disabled={!canManage}
                    onChange={(url) => setSiteForm({
                      ...siteForm,
                      images: { ...siteForm.images, brandStory: { ...siteForm.images.brandStory, left: url } }
                    })}
                  />
                  <ImageField
                    label="Top-Right Card"
                    description="Square photo. Default: Heart."
                    value={siteForm.images?.brandStory?.topRight}
                    disabled={!canManage}
                    onChange={(url) => setSiteForm({
                      ...siteForm,
                      images: { ...siteForm.images, brandStory: { ...siteForm.images.brandStory, topRight: url } }
                    })}
                  />
                  <ImageField
                    label="Bottom-Right Card"
                    description="Horizontal 4:3 photo. Default: Teddy."
                    value={siteForm.images?.brandStory?.bottomRight}
                    disabled={!canManage}
                    onChange={(url) => setSiteForm({
                      ...siteForm,
                      images: { ...siteForm.images, brandStory: { ...siteForm.images.brandStory, bottomRight: url } }
                    })}
                  />
                </div>
              </section>

              {/* Section 3: Made to fit your style */}
              <section className="rounded-3xl border border-sand bg-ivory/60 p-4 sm:p-6 space-y-4 min-w-0 overflow-hidden">
                <div>
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-bloom">Home Page · Custom Order CTA</span>
                  <h2 className="font-display text-xl text-plum mt-0.5">
                    "Made to fit your style" Section Image
                  </h2>
                  <p className="text-xs text-muted mt-1">
                    The showcase image displayed inside the dark plum clothing banner on the home page.
                  </p>
                </div>
                <div className="max-w-xl">
                  <ImageField
                    label="Clothing Banner Card Image"
                    description="Square photo displayed next to 'Crochet clothes, made especially for you'. Default: Soft yarn art."
                    value={siteForm.images?.customOrderCta?.banner}
                    disabled={!canManage}
                    onChange={(url) => setSiteForm({
                      ...siteForm,
                      images: { ...siteForm.images, customOrderCta: { ...siteForm.images.customOrderCta, banner: url } }
                    })}
                  />
                </div>
              </section>

              {/* Section 4: From the craft table */}
              <section className="rounded-3xl border border-sand bg-ivory/60 p-4 sm:p-6 space-y-4 min-w-0 overflow-hidden">
                <div>
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-bloom">Home Page · Behind the scenes</span>
                  <h2 className="font-display text-xl text-plum mt-0.5">
                    "From the craft table" Gallery Photos
                  </h2>
                  <p className="text-xs text-muted mt-1">
                    The 8 photo cards in the workshop gallery grid. Upload your own snapshots or leave empty for default brand visuals.
                  </p>
                </div>
                <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
                  {siteForm.images?.craftTable?.map((item, idx) => (
                    <ImageField
                      key={item.id || idx}
                      label={`Gallery Photo #${idx + 1}${item.tall ? ' (Tall)' : ''}`}
                      description={`Slot ${idx + 1} — default visual: ${item.visual || 'yarn'}`}
                      value={item.image}
                      disabled={!canManage}
                      onChange={(url) => {
                        const next = [...(siteForm.images?.craftTable || [])]
                        next[idx] = { ...next[idx], image: url }
                        setSiteForm({
                          ...siteForm,
                          images: { ...siteForm.images, craftTable: next }
                        })
                      }}
                    />
                  ))}
                </div>
              </section>

              {/* Section 5: Custom Orders Page Showcase */}
              <section className="rounded-3xl border border-sand bg-ivory/60 p-4 sm:p-6 space-y-4 min-w-0 overflow-hidden">
                <div>
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-bloom">Custom Orders Page</span>
                  <h2 className="font-display text-xl text-plum mt-0.5">
                    Custom Order Page Showcase Cards
                  </h2>
                  <p className="text-xs text-muted mt-1">
                    The 3 inspiration cards displayed above the custom request form at /custom-orders.
                  </p>
                </div>
                <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
                  <ImageField
                    label="Card 1 (Teddy slot)"
                    description="Default: Teddy bear illustration."
                    value={siteForm.images?.customOrdersPage?.card1}
                    disabled={!canManage}
                    onChange={(url) => setSiteForm({
                      ...siteForm,
                      images: { ...siteForm.images, customOrdersPage: { ...siteForm.images.customOrdersPage, card1: url } }
                    })}
                  />
                  <ImageField
                    label="Card 2 (Bouquet slot)"
                    description="Default: Floral bouquet illustration."
                    value={siteForm.images?.customOrdersPage?.card2}
                    disabled={!canManage}
                    onChange={(url) => setSiteForm({
                      ...siteForm,
                      images: { ...siteForm.images, customOrdersPage: { ...siteForm.images.customOrdersPage, card2: url } }
                    })}
                  />
                  <ImageField
                    label="Card 3 (Gift slot)"
                    description="Default: Wrapped gift illustration."
                    value={siteForm.images?.customOrdersPage?.card3}
                    disabled={!canManage}
                    onChange={(url) => setSiteForm({
                      ...siteForm,
                      images: { ...siteForm.images, customOrdersPage: { ...siteForm.images.customOrdersPage, card3: url } }
                    })}
                  />
                </div>
              </section>

              {canManage && (
                <div className="pt-2 sticky bottom-4 z-20">
                  <button
                    type="submit"
                    disabled={siteSaving}
                    className="rounded-full bg-plum px-8 py-3.5 font-semibold text-cream shadow-lift transition hover:bg-ink disabled:opacity-60 text-sm"
                  >
                    {siteSaving ? 'Saving images…' : 'Save all storefront images'}
                  </button>
                </div>
              )}
            </>
          )}
        </form>
      )}

      {/* ================= TAB 3: PAYMENT & UPI ================= */}
      {activeTab === 'payment' && (
        <div className="max-w-2xl">
          {paymentLoading ? (
            <p role="status" className="text-sm text-muted">Loading payment settings…</p>
          ) : (
            <form onSubmit={savePayment} className="space-y-4 rounded-3xl bg-cream p-6 shadow-soft ring-1 ring-sand">
              <header className="mb-2">
                <h2 className="font-display text-xl text-plum">Payment destination</h2>
                <p className="mt-1 text-xs text-muted">
                  Configure the recipient UPI ID and verification destination used during customer checkout.
                </p>
              </header>

              <label className="block text-sm font-medium text-plum">
                Merchant UPI ID
                <input
                  required
                  readOnly={!canManage}
                  value={paymentForm.merchantVpa}
                  onChange={(e) => setPaymentForm({ ...paymentForm, merchantVpa: e.target.value.trim() })}
                  placeholder="business@bank"
                  className="mt-1.5 w-full rounded-xl border border-sand bg-white px-4 py-3 read-only:bg-ink/5 focus:border-bloom focus:outline-none focus:ring-2 focus:ring-bloom/20"
                />
              </label>
              <p className="-mt-2 text-xs text-muted">
                Destination account that receives customer payments via QR code.
              </p>

              <label className="block text-sm font-medium text-plum">
                Merchant name
                <input
                  required
                  readOnly={!canManage}
                  value={paymentForm.merchantName}
                  onChange={(e) => setPaymentForm({ ...paymentForm, merchantName: e.target.value })}
                  className="mt-1.5 w-full rounded-xl border border-sand bg-white px-4 py-3 read-only:bg-ink/5 focus:border-bloom focus:outline-none focus:ring-2 focus:ring-bloom/20"
                />
              </label>

              <label className="block text-sm font-medium text-plum">
                WhatsApp number for payment screenshot confirmation
                <input
                  readOnly={!canManage}
                  value={paymentForm.whatsappNumber}
                  onChange={(e) => setPaymentForm({ ...paymentForm, whatsappNumber: e.target.value })}
                  placeholder="919876543210"
                  className="mt-1.5 w-full rounded-xl border border-sand bg-white px-4 py-3 read-only:bg-ink/5 focus:border-bloom focus:outline-none focus:ring-2 focus:ring-bloom/20"
                />
              </label>

              {canManage && (
                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={paymentSaving}
                    className="rounded-full bg-plum px-6 py-3 font-semibold text-cream shadow-soft transition hover:bg-ink disabled:opacity-60"
                  >
                    {paymentSaving ? 'Saving…' : 'Save payment settings'}
                  </button>
                </div>
              )}
            </form>
          )}
        </div>
      )}
    </div>
  )
}

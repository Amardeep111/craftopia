'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import {
  BookOpen,
  CheckCircle2,
  ExternalLink,
  Plus,
  Save,
  Trash2,
  Upload,
} from 'lucide-react'
import { useAdminAccess } from '../access-context'
import CraftIllustration from '@/components/ui/CraftIllustration'

const VISUAL_OPTIONS = [
  { value: 'yarn', label: 'Yarn Ball' },
  { value: 'flower', label: 'Crochet Flower' },
  { value: 'heart', label: 'Heart' },
  { value: 'bouquet', label: 'Bouquet' },
  { value: 'bow', label: 'Bow' },
  { value: 'basket', label: 'Basket' },
]

export default function AboutTab() {
  const { can } = useAdminAccess()
  const canManage = can('settings.manage')

  const [form, setForm] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [uploadingField, setUploadingField] = useState(null)
  const [notice, setNotice] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch('/api/admin/about', { cache: 'no-store' })
        const json = await res.json()
        if (!res.ok || !json.success) throw new Error(json.error || 'Failed to load about content.')
        setForm(json.data)
      } catch (err) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  async function handleImageUpload(file, onUploaded) {
    if (!file) return
    setError('')
    setNotice('')
    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('folder', 'jamaes-craftopia/storefront')
      formData.append('productId', 'about-page')
      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      })
      const result = await res.json()
      if (!res.ok || !result.success) throw new Error(result.error || 'Upload failed.')
      onUploaded(result.url)
      setNotice('Image uploaded successfully.')
      setTimeout(() => setNotice(''), 3000)
    } catch (err) {
      setError(err.message || 'Image upload failed. You can paste a direct URL instead.')
    } finally {
      setUploadingField(null)
    }
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!canManage) return
    setError('')
    setNotice('')
    setSaving(true)
    try {
      const res = await fetch('/api/admin/about', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const result = await res.json()
      if (!res.ok || !result.success) throw new Error(result.error || 'Could not save changes.')
      setNotice('About page updated successfully! Changes are now live on your storefront.')
      setTimeout(() => setNotice(''), 4500)
    } catch (err) {
      setError(err.message || 'Failed to save.')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="max-w-4xl space-y-6">
        <div className="h-8 w-60 rounded bg-sand/60 animate-pulse" />
        <div className="h-64 rounded-2xl bg-cream animate-pulse ring-1 ring-sand" />
      </div>
    )
  }

  if (!form) {
    return (
      <div className="max-w-4xl p-6 rounded-2xl bg-bloom/10 text-bloom">
        {error || 'Failed to load About page configuration.'}
      </div>
    )
  }

  return (
    <div className="max-w-4xl space-y-8 pb-16">
      {/* Tab Header & Action */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-sand pb-4">
        <div>
          <h2 className="font-display text-2xl text-plum flex items-center gap-2.5">
            <BookOpen className="h-6 w-6 text-bloom" /> About Page Content
          </h2>
          <p className="mt-1 text-xs sm:text-sm text-muted">
            Customize the brand story, upload photographs of the makers, and edit the craftsmanship journey.
          </p>
        </div>
        <Link
          href="/about"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 rounded-full border border-plum/30 bg-white px-4 py-2 text-xs font-semibold text-plum shadow-soft hover:bg-blush/30 transition"
        >
          View live About page <ExternalLink className="h-3.5 w-3.5" />
        </Link>
      </div>

      {notice && (
        <div className="rounded-xl bg-sage/20 border border-sage/40 p-4 text-sm font-semibold text-emerald-800 flex items-center gap-2">
          <CheckCircle2 className="h-5 w-5 shrink-0" />
          <span>{notice}</span>
        </div>
      )}

      {error && (
        <div className="rounded-xl bg-bloom/10 border border-bloom/30 p-4 text-sm font-semibold text-bloom">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* SECTION 1: HERO HEADER */}
        <div className="rounded-2xl bg-cream p-4 sm:p-6 shadow-soft ring-1 ring-sand space-y-4 min-w-0">
          <h3 className="font-display text-lg text-plum border-b border-sand pb-2">Hero Banner</h3>
          <div className="grid gap-4 grid-cols-1 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-muted">
                Eyebrow tag
              </label>
              <input
                type="text"
                value={form.header?.eyebrow || ''}
                readOnly={!canManage}
                onChange={(e) =>
                  setForm({ ...form, header: { ...form.header, eyebrow: e.target.value } })
                }
                className="mt-1.5 w-full min-w-0 rounded-xl border border-sand bg-white px-3.5 py-2.5 text-sm text-plum outline-none focus:border-bloom"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-muted">
                Page Title
              </label>
              <input
                type="text"
                value={form.header?.title || ''}
                readOnly={!canManage}
                onChange={(e) =>
                  setForm({ ...form, header: { ...form.header, title: e.target.value } })
                }
                className="mt-1.5 w-full min-w-0 rounded-xl border border-sand bg-white px-3.5 py-2.5 text-sm text-plum outline-none focus:border-bloom"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-muted">
              Header Subtitle / Description
            </label>
            <textarea
              rows={2}
              value={form.header?.description || ''}
              readOnly={!canManage}
              onChange={(e) =>
                setForm({ ...form, header: { ...form.header, description: e.target.value } })
              }
              className="mt-1.5 w-full min-w-0 rounded-xl border border-sand bg-white px-3.5 py-2.5 text-sm text-plum outline-none focus:border-bloom"
            />
          </div>
        </div>

        {/* SECTION 2: OUR STORY & STORY IMAGE */}
        <div className="rounded-2xl bg-cream p-4 sm:p-6 shadow-soft ring-1 ring-sand space-y-5 min-w-0">
          <h3 className="font-display text-lg text-plum border-b border-sand pb-2">
            Our Story & Craft Table
          </h3>

          <div className="grid gap-6 grid-cols-1 lg:grid-cols-2 items-start">
            {/* Story Text Inputs */}
            <div className="space-y-4 min-w-0">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-muted">
                  Story Section Title
                </label>
                <input
                  type="text"
                  value={form.story?.title || ''}
                  readOnly={!canManage}
                  onChange={(e) =>
                    setForm({ ...form, story: { ...form.story, title: e.target.value } })
                  }
                  className="mt-1.5 w-full min-w-0 rounded-xl border border-sand bg-white px-3.5 py-2.5 text-sm text-plum outline-none focus:border-bloom"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-muted">
                  Story Subtitle / Catchphrase
                </label>
                <input
                  type="text"
                  value={form.story?.description || ''}
                  readOnly={!canManage}
                  onChange={(e) =>
                    setForm({ ...form, story: { ...form.story, description: e.target.value } })
                  }
                  className="mt-1.5 w-full min-w-0 rounded-xl border border-sand bg-white px-3.5 py-2.5 text-sm text-plum outline-none focus:border-bloom"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-muted">
                  Paragraph 1
                </label>
                <textarea
                  rows={3}
                  value={form.story?.paragraph1 || ''}
                  readOnly={!canManage}
                  onChange={(e) =>
                    setForm({ ...form, story: { ...form.story, paragraph1: e.target.value } })
                  }
                  className="mt-1.5 w-full min-w-0 rounded-xl border border-sand bg-white px-3.5 py-2 text-sm text-plum outline-none focus:border-bloom"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-muted">
                  Paragraph 2
                </label>
                <textarea
                  rows={3}
                  value={form.story?.paragraph2 || ''}
                  readOnly={!canManage}
                  onChange={(e) =>
                    setForm({ ...form, story: { ...form.story, paragraph2: e.target.value } })
                  }
                  className="mt-1.5 w-full min-w-0 rounded-xl border border-sand bg-white px-3.5 py-2 text-sm text-plum outline-none focus:border-bloom"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-muted">
                  Highlight Quote Box
                </label>
                <textarea
                  rows={3}
                  value={form.story?.quote || ''}
                  readOnly={!canManage}
                  onChange={(e) =>
                    setForm({ ...form, story: { ...form.story, quote: e.target.value } })
                  }
                  className="mt-1.5 w-full min-w-0 rounded-xl border border-sand bg-white px-3.5 py-2 text-sm text-plum outline-none focus:border-bloom"
                />
              </div>
            </div>

            {/* Story Image & Preview */}
            <div className="rounded-xl border border-sand bg-white/70 p-4 space-y-4 min-w-0">
              <label className="block text-xs font-semibold uppercase tracking-wider text-plum">
                Story Image / Photograph
              </label>

              {/* Preview Container */}
              <div className="aspect-[4/3] w-full overflow-hidden rounded-xl bg-ivory border border-sand flex items-center justify-center relative">
                {form.story?.image ? (
                  <img
                    src={form.story.image}
                    alt="Story preview"
                    className="h-full w-full object-cover"
                    onError={(e) => {
                      e.currentTarget.style.display = 'none'
                      e.currentTarget.parentElement.querySelector('.fallback-preview').style.display = 'block'
                    }}
                  />
                ) : null}
                <div
                  className={`fallback-preview h-full w-full ${
                    form.story?.image ? 'hidden' : 'block'
                  }`}
                >
                  <CraftIllustration
                    visual={form.story?.visual || 'yarn'}
                    palette={form.story?.palette || ['#D9CDE8', '#5A3D4A']}
                    className="h-full w-full"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-muted">Image URL</label>
                <div className="mt-1 flex gap-2 min-w-0">
                  <input
                    type="text"
                    value={form.story?.image || ''}
                    readOnly={!canManage}
                    placeholder="https://... or upload photo"
                    onChange={(e) =>
                      setForm({ ...form, story: { ...form.story, image: e.target.value } })
                    }
                    className="flex-1 min-w-0 rounded-xl border border-sand bg-white px-3 py-2 text-xs sm:text-sm text-plum outline-none focus:border-bloom"
                  />
                  {canManage && (
                    <label className="shrink-0 inline-flex cursor-pointer items-center gap-1.5 rounded-xl bg-plum px-3 py-2 text-xs font-semibold text-cream hover:bg-ink transition">
                      <Upload className="h-3.5 w-3.5" />
                      <span>{uploadingField === 'story' ? 'Uploading...' : 'Upload'}</span>
                      <input
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        className="sr-only"
                        onChange={(e) => {
                          if (e.target.files?.[0]) {
                            setUploadingField('story')
                            handleImageUpload(e.target.files[0], (url) => {
                              setForm({ ...form, story: { ...form.story, image: url } })
                            })
                            e.target.value = ''
                          }
                        }}
                      />
                    </label>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-muted">
                  Fallback Illustration (used when no photo is uploaded)
                </label>
                <select
                  value={form.story?.visual || 'yarn'}
                  disabled={!canManage}
                  onChange={(e) =>
                    setForm({ ...form, story: { ...form.story, visual: e.target.value } })
                  }
                  className="mt-1 w-full rounded-xl border border-sand bg-white px-3 py-2 text-xs text-plum outline-none"
                >
                  {VISUAL_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* SECTION 3: MEET THE MAKERS */}
        <div className="rounded-2xl bg-cream p-4 sm:p-6 shadow-soft ring-1 ring-sand space-y-6 min-w-0">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-sand pb-3">
            <div>
              <h3 className="font-display text-lg text-plum">Meet the Makers</h3>
              <p className="text-xs text-muted">Manage the creators, their photographs, roles, and bios.</p>
            </div>
            {canManage && (
              <button
                type="button"
                onClick={() => {
                  const newMaker = {
                    id: 'maker-' + Date.now(),
                    name: 'New Maker',
                    role: 'Maker',
                    image: '',
                    visual: 'heart',
                    palette: ['#D9CDE8', '#C96B7B'],
                    bio: 'A passionate creator crafting handmade pieces with care.',
                  }
                  setForm({ ...form, makers: [...(form.makers || []), newMaker] })
                }}
                className="inline-flex items-center gap-1.5 rounded-full bg-plum px-4 py-1.5 text-xs font-semibold text-cream hover:bg-ink shadow-sm transition"
              >
                <Plus className="h-3.5 w-3.5" /> Add Maker
              </button>
            )}
          </div>

          <div className="grid gap-3 grid-cols-1 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-muted">
                Makers Section Heading
              </label>
              <input
                type="text"
                value={form.makersHeading?.title || ''}
                readOnly={!canManage}
                onChange={(e) =>
                  setForm({ ...form, makersHeading: { ...form.makersHeading, title: e.target.value } })
                }
                className="mt-1 w-full min-w-0 rounded-xl border border-sand bg-white px-3 py-2 text-sm text-plum outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-muted">
                Makers Description / Subheading
              </label>
              <input
                type="text"
                value={form.makersHeading?.description || ''}
                readOnly={!canManage}
                onChange={(e) =>
                  setForm({ ...form, makersHeading: { ...form.makersHeading, description: e.target.value } })
                }
                className="mt-1 w-full min-w-0 rounded-xl border border-sand bg-white px-3 py-2 text-sm text-plum outline-none"
              />
            </div>
          </div>

          {/* Makers list */}
          <div className="grid gap-6 grid-cols-1 lg:grid-cols-2">
            {(form.makers || []).map((maker, idx) => (
              <div
                key={maker.id || idx}
                className="rounded-2xl border border-sand bg-white/80 p-4 sm:p-5 shadow-sm space-y-4 min-w-0"
              >
                <div className="flex items-center justify-between border-b border-sand/60 pb-2">
                  <h4 className="font-display text-base font-semibold text-plum truncate">
                    {maker.name || `Maker #${idx + 1}`}
                  </h4>
                  {canManage && (form.makers || []).length > 1 && (
                    <button
                      type="button"
                      onClick={() => {
                        const updated = form.makers.filter((_, i) => i !== idx)
                        setForm({ ...form, makers: updated })
                      }}
                      className="text-xs text-bloom font-medium hover:underline inline-flex items-center gap-1 shrink-0"
                    >
                      <Trash2 className="h-3.5 w-3.5" /> Remove
                    </button>
                  )}
                </div>

                {/* Photo Preview Container */}
                <div className="aspect-[5/4] w-full overflow-hidden rounded-xl bg-ivory border border-sand flex items-center justify-center relative">
                  {maker.image ? (
                    <img
                      src={maker.image}
                      alt={maker.name}
                      className="h-full w-full object-cover"
                      onError={(e) => {
                        e.currentTarget.style.display = 'none'
                        e.currentTarget.parentElement.querySelector('.maker-fallback-preview').style.display = 'block'
                      }}
                    />
                  ) : null}
                  <div
                    className={`maker-fallback-preview h-full w-full ${
                      maker.image ? 'hidden' : 'block'
                    }`}
                  >
                    <CraftIllustration
                      visual={maker.visual || 'flower'}
                      palette={maker.palette || ['#E8B4B8', '#F7EFE6']}
                      className="h-full w-full"
                    />
                  </div>
                </div>

                <div className="grid gap-3 grid-cols-1 sm:grid-cols-2">
                  <div>
                    <label className="block text-xs font-medium text-muted">Name</label>
                    <input
                      type="text"
                      value={maker.name || ''}
                      readOnly={!canManage}
                      onChange={(e) => {
                        const next = [...form.makers]
                        next[idx] = { ...next[idx], name: e.target.value }
                        setForm({ ...form, makers: next })
                      }}
                      className="mt-1 w-full min-w-0 rounded-xl border border-sand bg-white px-3 py-1.5 text-sm text-plum outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-muted">Role Tag</label>
                    <input
                      type="text"
                      value={maker.role || ''}
                      readOnly={!canManage}
                      onChange={(e) => {
                        const next = [...form.makers]
                        next[idx] = { ...next[idx], role: e.target.value }
                        setForm({ ...form, makers: next })
                      }}
                      className="mt-1 w-full min-w-0 rounded-xl border border-sand bg-white px-3 py-1.5 text-sm text-plum outline-none"
                    />
                  </div>
                </div>

                {/* Image URL & Upload */}
                <div>
                  <label className="block text-xs font-medium text-muted">Photograph / Portrait URL</label>
                  <div className="mt-1 flex gap-2 min-w-0">
                    <input
                      type="text"
                      value={maker.image || ''}
                      readOnly={!canManage}
                      placeholder="https://... or upload photo"
                      onChange={(e) => {
                        const next = [...form.makers]
                        next[idx] = { ...next[idx], image: e.target.value }
                        setForm({ ...form, makers: next })
                      }}
                      className="flex-1 min-w-0 rounded-xl border border-sand bg-white px-3 py-2 text-xs text-plum outline-none focus:border-bloom"
                    />
                    {canManage && (
                      <label className="shrink-0 inline-flex cursor-pointer items-center gap-1 rounded-xl bg-plum px-3 py-2 text-xs font-semibold text-cream hover:bg-ink transition">
                        <Upload className="h-3 w-3" />
                        <span>{uploadingField === `maker-${idx}` ? '...' : 'Upload'}</span>
                        <input
                          type="file"
                          accept="image/jpeg,image/png,image/webp"
                          className="sr-only"
                          onChange={(e) => {
                            if (e.target.files?.[0]) {
                              setUploadingField(`maker-${idx}`)
                              handleImageUpload(e.target.files[0], (url) => {
                                const next = [...form.makers]
                                next[idx] = { ...next[idx], image: url }
                                setForm({ ...form, makers: next })
                              })
                              e.target.value = ''
                            }
                          }}
                        />
                      </label>
                    )}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-muted">Fallback Illustration</label>
                  <select
                    value={maker.visual || 'flower'}
                    disabled={!canManage}
                    onChange={(e) => {
                      const next = [...form.makers]
                      next[idx] = { ...next[idx], visual: e.target.value }
                      setForm({ ...form, makers: next })
                    }}
                    className="mt-1 w-full rounded-xl border border-sand bg-white px-3 py-1.5 text-xs text-plum outline-none"
                  >
                    {VISUAL_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-muted">Maker Bio / Story</label>
                  <textarea
                    rows={4}
                    value={maker.bio || ''}
                    readOnly={!canManage}
                    onChange={(e) => {
                      const next = [...form.makers]
                      next[idx] = { ...next[idx], bio: e.target.value }
                      setForm({ ...form, makers: next })
                    }}
                    className="mt-1 w-full min-w-0 rounded-xl border border-sand bg-white px-3 py-2 text-xs leading-relaxed text-plum outline-none focus:border-bloom"
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* SECTION 4: WHAT WE HOLD CLOSE (VALUES) */}
        <div className="rounded-2xl bg-cream p-4 sm:p-6 shadow-soft ring-1 ring-sand space-y-4 min-w-0">
          <h3 className="font-display text-lg text-plum border-b border-sand pb-2">
            Values (What we hold close)
          </h3>
          <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
            {(form.values || []).map((val, idx) => (
              <div key={idx} className="rounded-xl border border-sand bg-white p-4 space-y-3 min-w-0">
                <span className="text-xs font-bold text-bloom">Value #{idx + 1}</span>
                <div>
                  <label className="block text-xs font-medium text-muted">Title</label>
                  <input
                    type="text"
                    value={val.title || ''}
                    readOnly={!canManage}
                    onChange={(e) => {
                      const next = [...form.values]
                      next[idx] = { ...next[idx], title: e.target.value }
                      setForm({ ...form, values: next })
                    }}
                    className="mt-1 w-full min-w-0 rounded-xl border border-sand bg-ivory/50 px-3 py-1.5 text-xs font-semibold text-plum outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-muted">Description</label>
                  <textarea
                    rows={3}
                    value={val.text || ''}
                    readOnly={!canManage}
                    onChange={(e) => {
                      const next = [...form.values]
                      next[idx] = { ...next[idx], text: e.target.value }
                      setForm({ ...form, values: next })
                    }}
                    className="mt-1 w-full min-w-0 rounded-xl border border-sand bg-ivory/50 px-3 py-1.5 text-xs text-plum outline-none"
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* SECTION 5: CRAFTING PROCESS */}
        <div className="rounded-2xl bg-cream p-4 sm:p-6 shadow-soft ring-1 ring-sand space-y-4 min-w-0">
          <h3 className="font-display text-lg text-plum border-b border-sand pb-2">
            How a Piece is Made (Process)
          </h3>
          <div className="grid gap-6 grid-cols-1 lg:grid-cols-2 items-start">
            <div className="space-y-4 min-w-0">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-muted">
                  Section Title
                </label>
                <input
                  type="text"
                  value={form.crafting?.title || ''}
                  readOnly={!canManage}
                  onChange={(e) =>
                    setForm({ ...form, crafting: { ...form.crafting, title: e.target.value } })
                  }
                  className="mt-1.5 w-full min-w-0 rounded-xl border border-sand bg-white px-3 py-2 text-sm text-plum outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-muted">Step 1 Title & Text</label>
                <input
                  type="text"
                  value={form.crafting?.step1Title || ''}
                  readOnly={!canManage}
                  onChange={(e) =>
                    setForm({ ...form, crafting: { ...form.crafting, step1Title: e.target.value } })
                  }
                  className="mt-1 w-full min-w-0 rounded-xl border border-sand bg-white px-3 py-1.5 text-xs font-semibold text-plum outline-none"
                />
                <input
                  type="text"
                  value={form.crafting?.step1Text || ''}
                  readOnly={!canManage}
                  onChange={(e) =>
                    setForm({ ...form, crafting: { ...form.crafting, step1Text: e.target.value } })
                  }
                  className="mt-1 w-full min-w-0 rounded-xl border border-sand bg-white px-3 py-1.5 text-xs text-plum outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-muted">Step 2 Title & Text</label>
                <input
                  type="text"
                  value={form.crafting?.step2Title || ''}
                  readOnly={!canManage}
                  onChange={(e) =>
                    setForm({ ...form, crafting: { ...form.crafting, step2Title: e.target.value } })
                  }
                  className="mt-1 w-full min-w-0 rounded-xl border border-sand bg-white px-3 py-1.5 text-xs font-semibold text-plum outline-none"
                />
                <input
                  type="text"
                  value={form.crafting?.step2Text || ''}
                  readOnly={!canManage}
                  onChange={(e) =>
                    setForm({ ...form, crafting: { ...form.crafting, step2Text: e.target.value } })
                  }
                  className="mt-1 w-full min-w-0 rounded-xl border border-sand bg-white px-3 py-1.5 text-xs text-plum outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-muted">Step 3 Title & Text</label>
                <input
                  type="text"
                  value={form.crafting?.step3Title || ''}
                  readOnly={!canManage}
                  onChange={(e) =>
                    setForm({ ...form, crafting: { ...form.crafting, step3Title: e.target.value } })
                  }
                  className="mt-1 w-full min-w-0 rounded-xl border border-sand bg-white px-3 py-1.5 text-xs font-semibold text-plum outline-none"
                />
                <input
                  type="text"
                  value={form.crafting?.step3Text || ''}
                  readOnly={!canManage}
                  onChange={(e) =>
                    setForm({ ...form, crafting: { ...form.crafting, step3Text: e.target.value } })
                  }
                  className="mt-1 w-full min-w-0 rounded-xl border border-sand bg-white px-3 py-1.5 text-xs text-plum outline-none"
                />
              </div>
            </div>

            {/* Crafting Image */}
            <div className="rounded-xl border border-sand bg-white/70 p-4 space-y-4 min-w-0">
              <label className="block text-xs font-semibold uppercase tracking-wider text-plum">
                Crafting Image / Photograph
              </label>

              <div className="aspect-square w-full overflow-hidden rounded-xl bg-ivory border border-sand flex items-center justify-center relative">
                {form.crafting?.image ? (
                  <img
                    src={form.crafting.image}
                    alt="Crafting preview"
                    className="h-full w-full object-cover"
                    onError={(e) => {
                      e.currentTarget.style.display = 'none'
                      e.currentTarget.parentElement.querySelector('.craft-fallback-preview').style.display = 'block'
                    }}
                  />
                ) : null}
                <div
                  className={`craft-fallback-preview h-full w-full ${
                    form.crafting?.image ? 'hidden' : 'block'
                  }`}
                >
                  <CraftIllustration
                    visual={form.crafting?.visual || 'bouquet'}
                    palette={form.crafting?.palette || ['#F3C9B8', '#E8B4B8', '#C5D1C0']}
                    className="h-full w-full"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-muted">Image URL</label>
                <div className="mt-1 flex gap-2 min-w-0">
                  <input
                    type="text"
                    value={form.crafting?.image || ''}
                    readOnly={!canManage}
                    placeholder="https://... or upload photo"
                    onChange={(e) =>
                      setForm({ ...form, crafting: { ...form.crafting, image: e.target.value } })
                    }
                    className="flex-1 min-w-0 rounded-xl border border-sand bg-white px-3 py-2 text-xs sm:text-sm text-plum outline-none focus:border-bloom"
                  />
                  {canManage && (
                    <label className="shrink-0 inline-flex cursor-pointer items-center gap-1.5 rounded-xl bg-plum px-3 py-2 text-xs font-semibold text-cream hover:bg-ink transition">
                      <Upload className="h-3.5 w-3.5" />
                      <span>{uploadingField === 'crafting' ? '...' : 'Upload'}</span>
                      <input
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        className="sr-only"
                        onChange={(e) => {
                          if (e.target.files?.[0]) {
                            setUploadingField('crafting')
                            handleImageUpload(e.target.files[0], (url) => {
                              setForm({ ...form, crafting: { ...form.crafting, image: url } })
                            })
                            e.target.value = ''
                          }
                        }}
                      />
                    </label>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* SAVE BUTTON */}
        {canManage && (
          <div className="sticky bottom-4 z-20 flex justify-end">
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center gap-2 rounded-full bg-plum px-8 py-3 text-sm font-semibold tracking-wide text-cream shadow-lift transition hover:bg-ink disabled:opacity-50"
            >
              <Save className="h-4 w-4" />
              <span>{saving ? 'Saving changes...' : 'Save About Page'}</span>
            </button>
          </div>
        )}
      </form>
    </div>
  )
}

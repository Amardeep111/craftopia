'use client'

import { useEffect, useState } from 'react'
import {
  FolderPlus,
  Pencil,
  Eye,
  EyeOff,
  Image as ImageIcon,
  Upload,
  Trash2,
  Loader2,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  Sparkles,
} from 'lucide-react'
import { useAdminAccess } from '../access-context'
import { uploadProductImage } from '@/lib/images'
import Modal from '@/components/ui/Modal'

const emptyCategory = {
  name: '',
  slug: '',
  description: '',
  accent: '',
  image: '',
  order: '0',
  published: true,
  hidden: false,
}

const PRESET_ACCENTS = [
  { name: 'blush', hex: '#E8B4B8', label: 'Blush' },
  { name: 'lavender', hex: '#D9CDE8', label: 'Lavender' },
  { name: 'plum', hex: '#5A3D5C', label: 'Plum' },
  { name: 'sage', hex: '#8EA89D', label: 'Sage' },
  { name: 'bloom', hex: '#964F66', label: 'Bloom' },
  { name: 'honey', hex: '#E5A93C', label: 'Honey' },
]

function toSlug(text) {
  return (text || '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)+/g, '')
}

function CategoryEditor({ initial, onCancel, onSaved }) {
  const isEditing = Boolean(initial?.id)
  const [form, setForm] = useState(() => ({
    ...emptyCategory,
    ...initial,
    order: String(initial?.order ?? 0),
    description: initial?.description || '',
    accent: initial?.accent || '',
    image: initial?.image || '',
    slug: initial?.slug || '',
    published: initial?.published !== false,
    hidden: initial?.hidden === true,
  }))

  const [slugTouched, setSlugTouched] = useState(isEditing)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [notice, setNotice] = useState('')

  function update(field, value) {
    setForm((current) => ({ ...current, [field]: value }))
  }

  function handleNameChange(val) {
    update('name', val)
    if (!slugTouched && !isEditing) {
      update('slug', toSlug(val))
    }
  }

  async function uploadImage(file) {
    if (!file) return
    setUploading(true)
    setError('')
    try {
      const uploadResult = await uploadProductImage(file, isEditing && initial?.id ? initial.id : 'categories')
      update('image', uploadResult.url)
    } catch (e) {
      setError(e.message || 'Image upload failed.')
    } finally {
      setUploading(false)
    }
  }

  async function submit(event) {
    event.preventDefault()
    setError('')
    setNotice('')
    setSaving(true)

    const finalSlug = (form.slug || toSlug(form.name)).trim()
    const payload = {
      ...form,
      slug: finalSlug,
      order: Number(form.order) || 0,
      published: form.published === true,
      hidden: form.hidden === true,
    }

    try {
      const response = await fetch('/api/admin/categories', {
        method: isEditing ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(isEditing ? { id: initial.id, ...payload } : payload),
      })
      const result = await response.json()
      if (!response.ok || !result.success) throw new Error(result.error || 'Could not save category.')
      setNotice(isEditing ? 'Category updated successfully.' : 'Category created successfully.')
      await onSaved()
    } catch (e) {
      setError(e.message || 'Could not save category.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={submit} className="space-y-5">
      {notice && (
        <div role="status" className="flex items-center gap-2 rounded-xl bg-sage/20 p-3 text-sm font-medium text-plum">
          <CheckCircle2 className="h-4 w-4 text-sage shrink-0" />
          <span>{notice}</span>
        </div>
      )}

      {error && (
        <div role="alert" className="flex items-start gap-2 rounded-xl bg-bloom/10 p-3 text-sm text-bloom">
          <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {/* Name and Slug */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-plum" htmlFor="cat-name">
            Category Name <span className="text-bloom">*</span>
          </label>
          <input
            id="cat-name"
            required
            value={form.name}
            onChange={(e) => handleNameChange(e.target.value)}
            placeholder="e.g. Crochet Flowers"
            className="mt-1.5 w-full rounded-xl border border-sand bg-white px-3.5 py-2.5 text-sm text-plum placeholder:text-muted focus:border-bloom focus:outline-none focus:ring-2 focus:ring-bloom/20"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-plum" htmlFor="cat-slug">
            URL Slug
          </label>
          <input
            id="cat-slug"
            value={form.slug}
            onChange={(e) => {
              setSlugTouched(true)
              update('slug', toSlug(e.target.value))
            }}
            placeholder="auto-generated from name"
            className="mt-1.5 w-full rounded-xl border border-sand bg-white px-3.5 py-2.5 font-mono text-sm text-plum placeholder:font-sans placeholder:text-muted focus:border-bloom focus:outline-none focus:ring-2 focus:ring-bloom/20"
          />
          <p className="mt-1 text-[11px] text-muted">
            Storefront link: <code className="font-mono text-plum">/shop?category={form.slug || 'slug'}</code>
          </p>
        </div>
      </div>

      {/* Description */}
      <div>
        <label className="block text-xs font-semibold uppercase tracking-wider text-plum" htmlFor="cat-desc">
          Description
        </label>
        <textarea
          id="cat-desc"
          value={form.description}
          onChange={(e) => update('description', e.target.value)}
          rows={3}
          placeholder="Brief description for category listings and SEO..."
          className="mt-1.5 w-full rounded-xl border border-sand bg-white px-3.5 py-2.5 text-sm text-plum placeholder:text-muted focus:border-bloom focus:outline-none focus:ring-2 focus:ring-bloom/20"
        />
      </div>

      {/* Image Preview & Upload */}
      <div>
        <label className="block text-xs font-semibold uppercase tracking-wider text-plum">
          Category Card Image
        </label>
        <div className="mt-2 flex flex-col sm:flex-row items-start gap-4">
          {/* Image Thumbnail */}
          <div className="relative h-32 w-28 shrink-0 overflow-hidden rounded-2xl bg-gradient-to-br from-blush/30 to-lavender/30 ring-1 ring-sand flex items-center justify-center">
            {form.image ? (
              <>
                <img src={form.image} alt="Category preview" className="h-full w-full object-cover" />
                <button
                  type="button"
                  onClick={() => update('image', '')}
                  className="absolute right-1.5 top-1.5 rounded-full bg-black/60 p-1 text-white hover:bg-black/80 transition"
                  title="Remove image"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </>
            ) : (
              <div className="text-center p-2 text-muted">
                <ImageIcon className="mx-auto h-7 w-7 opacity-60" />
                <span className="text-[10px] mt-1 block">No image</span>
              </div>
            )}
          </div>

          {/* Controls: file upload or URL */}
          <div className="flex-1 min-w-0 space-y-2 w-full">
            <div className="flex flex-wrap items-center gap-2">
              <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-plum/30 bg-white px-4 py-2 text-sm font-semibold text-plum hover:bg-ivory transition shadow-sm">
                <Upload className="h-4 w-4" />
                <span>{uploading ? 'Uploading…' : form.image ? 'Replace image file' : 'Upload photo'}</span>
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  disabled={uploading}
                  onChange={(e) => {
                    if (e.target.files?.[0]) uploadImage(e.target.files[0])
                    e.target.value = ''
                  }}
                  className="sr-only"
                />
              </label>
              {uploading && (
                <span className="inline-flex items-center gap-1.5 text-xs text-muted">
                  <Loader2 className="h-3.5 w-3.5 animate-spin text-plum" />
                  Optimizing and uploading…
                </span>
              )}
            </div>

            <div>
              <p className="text-[11px] text-muted mb-1">Or paste an existing image URL:</p>
              <input
                value={form.image}
                onChange={(e) => update('image', e.target.value)}
                placeholder="https://..."
                className="w-full rounded-xl border border-sand bg-white px-3 py-2 text-xs text-plum placeholder:text-muted focus:border-bloom focus:outline-none focus:ring-1 focus:ring-bloom/20"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Accent Color and Order */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-plum">
            Accent Color
          </label>
          <div className="mt-1.5 flex items-center gap-1.5 flex-wrap">
            {PRESET_ACCENTS.map((preset) => {
              const selected = (form.accent || '').toLowerCase() === preset.name
              return (
                <button
                  key={preset.name}
                  type="button"
                  onClick={() => update('accent', preset.name)}
                  className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium transition ring-1 ${
                    selected
                      ? 'ring-2 ring-plum bg-white font-semibold text-plum shadow-sm'
                      : 'ring-sand/70 bg-cream/70 text-muted hover:bg-white'
                  }`}
                >
                  <span
                    className="h-2.5 w-2.5 rounded-full ring-1 ring-black/10"
                    style={{ backgroundColor: preset.hex }}
                    aria-hidden="true"
                  />
                  <span>{preset.label}</span>
                </button>
              )
            })}
          </div>
          <input
            value={form.accent}
            onChange={(e) => update('accent', e.target.value)}
            placeholder="Custom color name or hex"
            className="mt-2 w-full rounded-xl border border-sand bg-white px-3.5 py-2 text-xs text-plum placeholder:text-muted focus:border-bloom focus:outline-none focus:ring-1 focus:ring-bloom/20"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-plum" htmlFor="cat-order">
            Display Sort Order
          </label>
          <input
            id="cat-order"
            type="number"
            min={0}
            value={form.order}
            onChange={(e) => update('order', e.target.value)}
            className="mt-1.5 w-full rounded-xl border border-sand bg-white px-3.5 py-2 text-sm text-plum focus:border-bloom focus:outline-none focus:ring-1 focus:ring-bloom/20"
          />
          <p className="mt-1 text-[11px] text-muted">
            Lower numbers appear first in the shop navigation (e.g. 0, 1, 2).
          </p>
        </div>
      </div>

      {/* Visibility Settings */}
      <div className="rounded-2xl bg-ivory/60 border border-sand/80 p-4 space-y-3">
        <p className="text-xs font-semibold uppercase tracking-wider text-plum">Storefront Visibility</p>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="flex items-start gap-3 rounded-xl border border-sand/70 bg-white p-3 cursor-pointer hover:border-plum/30 transition">
            <input
              type="checkbox"
              checked={form.published}
              onChange={(e) => update('published', e.target.checked)}
              className="mt-0.5 h-4 w-4 rounded accent-plum"
            />
            <div className="text-xs">
              <span className="font-semibold text-plum block">Published</span>
              <span className="text-muted text-[11px]">Active on the store and visible in search filters.</span>
            </div>
          </label>

          <label className="flex items-start gap-3 rounded-xl border border-sand/70 bg-white p-3 cursor-pointer hover:border-plum/30 transition">
            <input
              type="checkbox"
              checked={form.hidden}
              onChange={(e) => update('hidden', e.target.checked)}
              className="mt-0.5 h-4 w-4 rounded accent-plum"
            />
            <div className="text-xs">
              <span className="font-semibold text-plum block">Hidden from navigation</span>
              <span className="text-muted text-[11px]">Only accessible directly via URL; hidden from top shelves.</span>
            </div>
          </label>
        </div>
      </div>

      {/* Modal Actions */}
      <div className="flex items-center justify-end gap-3 border-t border-sand/70 pt-4">
        <button
          type="button"
          onClick={onCancel}
          className="min-h-11 rounded-full border border-sand bg-white px-5 text-sm font-semibold text-plum hover:bg-ivory transition"
        >
          Cancel
        </button>
        <button
          disabled={saving || uploading}
          type="submit"
          className="min-h-11 inline-flex items-center gap-2 rounded-full bg-plum px-6 text-sm font-semibold text-cream shadow-soft hover:bg-ink transition disabled:opacity-60"
        >
          {saving ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Saving…</span>
            </>
          ) : (
            <span>{isEditing ? 'Save Changes' : 'Create Category'}</span>
          )}
        </button>
      </div>
    </form>
  )
}

export default function AdminCategories() {
  const { can } = useAdminAccess()
  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(true)
  const [editorOpen, setEditorOpen] = useState(false)
  const [editorCategory, setEditorCategory] = useState(null)
  const [error, setError] = useState('')
  const [busyId, setBusyId] = useState(null)

  async function load() {
    try {
      const response = await fetch('/api/admin/categories')
      const data = await response.json()
      if (data.success) {
        // Sort by order ascending
        const sorted = (Array.isArray(data.data) ? data.data : []).sort(
          (a, b) => (Number(a.order) || 0) - (Number(b.order) || 0)
        )
        setCategories(sorted)
      } else {
        setError(data.error || 'Failed to load categories.')
      }
    } catch {
      setError('Failed to load categories.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  async function toggleVisibility(cat) {
    setBusyId(cat.id)
    setError('')
    const newPublished = !cat.published
    const newHidden = newPublished ? false : true
    try {
      const response = await fetch('/api/admin/categories', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: cat.id, published: newPublished, hidden: newHidden }),
      })
      const result = await response.json()
      if (!response.ok || !result.success) throw new Error(result.error || 'Could not update category.')
      await load()
    } catch (e) {
      setError(e.message || 'Could not update category.')
    } finally {
      setBusyId(null)
    }
  }

  function handleOpenCreate() {
    setEditorCategory(null)
    setEditorOpen(true)
    setError('')
  }

  function handleOpenEdit(cat) {
    setEditorCategory(cat)
    setEditorOpen(true)
    setError('')
  }

  return (
    <section className="space-y-6">
      {/* Header bar */}
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl text-plum">Categories</h1>
          <p className="mt-1 text-sm text-muted">
            Organize handcrafted products into collections displayed on the storefront.
          </p>
        </div>
        {can('categories.manage') && (
          <button
            type="button"
            onClick={handleOpenCreate}
            className="inline-flex min-h-11 items-center gap-2 rounded-full bg-plum px-5 text-sm font-semibold text-cream shadow-soft hover:bg-ink transition"
          >
            <FolderPlus className="h-4 w-4" />
            <span>Add Category</span>
          </button>
        )}
      </header>

      {error && (
        <div role="alert" className="flex items-center gap-2 rounded-xl bg-bloom/10 p-3 text-sm text-bloom">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Category Editor Modal (Always centered, zero auto-scroll jump) */}
      <Modal
        open={editorOpen}
        onClose={() => setEditorOpen(false)}
        title={editorCategory ? `Edit Category: ${editorCategory.name}` : 'Add New Category'}
        maxWidth="max-w-2xl"
      >
        <CategoryEditor
          initial={editorCategory}
          onCancel={() => setEditorOpen(false)}
          onSaved={async () => {
            setEditorOpen(false)
            await load()
          }}
        />
      </Modal>

      {/* Grid of Categories */}
      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, idx) => (
            <div key={idx} className="h-80 rounded-2xl bg-ivory/70 animate-pulse border border-sand/50" />
          ))}
        </div>
      ) : categories.length === 0 ? (
        <div className="rounded-2xl bg-cream p-12 text-center border border-sand">
          <p className="font-display text-lg text-plum">No categories found</p>
          <p className="mt-1 text-sm text-muted">Click "+ Add Category" above to create your first collection.</p>
        </div>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {categories.map((cat) => {
            const isVisible = cat.published && !cat.hidden
            const isHiddenOnly = cat.published && cat.hidden
            const isInactive = !cat.published

            return (
              <article
                key={cat.id}
                className={`min-w-0 flex flex-col justify-between overflow-hidden rounded-2xl bg-cream p-5 shadow-soft ring-1 transition duration-200 hover:shadow-md ${
                  isVisible
                    ? 'ring-sand'
                    : isHiddenOnly
                    ? 'ring-amber-200 bg-amber-50/30'
                    : 'ring-sand/60 opacity-75'
                }`}
              >
                <div>
                  {/* Category Image Card */}
                  <div className="relative block aspect-[4/5] overflow-hidden rounded-2xl bg-gradient-to-br from-blush/30 to-lavender/30">
                    {cat.image ? (
                      <img src={cat.image} alt={cat.name} className="h-full w-full object-cover transition duration-300 hover:scale-105" />
                    ) : (
                      <div className="flex h-full items-center justify-center">
                        <svg viewBox="0 0 120 120" aria-hidden="true" className="h-24 w-24 opacity-60">
                          <circle cx="60" cy="60" r="44" fill="none" stroke="#D9CDE8" strokeWidth="3" />
                          <circle cx="60" cy="60" r="30" fill="none" stroke="#E8B4B8" strokeWidth="3" />
                          <circle cx="60" cy="60" r="16" fill="none" stroke="#7A645C" strokeWidth="3" />
                        </svg>
                      </div>
                    )}
                    <div className="absolute left-3 top-3 flex items-center gap-1.5">
                      <span className="rounded-full bg-cream/95 backdrop-blur-sm px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-plum shadow-sm">
                        Order #{cat.order ?? 0}
                      </span>
                    </div>
                  </div>

                  {/* Header & Status */}
                  <div className="flex items-start justify-between gap-2 pt-4">
                    <h2 className="font-display text-xl text-plum">{cat.name}</h2>
                    {isVisible ? (
                      <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-sage/20 px-2.5 py-0.5 text-xs font-semibold text-sage">
                        <Eye className="h-3 w-3" /> Live
                      </span>
                    ) : isHiddenOnly ? (
                      <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-semibold text-amber-800">
                        <EyeOff className="h-3 w-3" /> Hidden
                      </span>
                    ) : (
                      <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-bloom/15 px-2.5 py-0.5 text-xs font-semibold text-bloom">
                        Inactive
                      </span>
                    )}
                  </div>

                  <p className="mt-0.5 font-mono text-xs text-muted">/shop?category={cat.slug}</p>
                  <p className="mt-2 text-sm text-muted line-clamp-2 leading-relaxed">
                    {cat.description || 'No description provided.'}
                  </p>

                  {cat.accent && (
                    <div className="mt-3 flex items-center gap-1.5 text-xs text-muted">
                      <span>Accent:</span>
                      <span className="rounded-md bg-ivory px-2 py-0.5 font-medium text-plum border border-sand">
                        {cat.accent}
                      </span>
                    </div>
                  )}
                </div>

                {/* Card Actions */}
                {can('categories.manage') && (
                  <div className="mt-5 flex gap-2 border-t border-sand/60 pt-3">
                    <button
                      type="button"
                      onClick={() => handleOpenEdit(cat)}
                      className="inline-flex min-h-10 flex-1 items-center justify-center gap-1.5 rounded-xl border border-sand bg-white px-3 text-sm font-semibold text-plum hover:bg-ivory transition shadow-sm"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                      <span>Edit</span>
                    </button>
                    <button
                      type="button"
                      disabled={busyId === cat.id}
                      onClick={() => toggleVisibility(cat)}
                      className={`inline-flex min-h-10 items-center justify-center gap-1.5 rounded-xl border px-3 text-sm font-semibold transition shadow-sm disabled:opacity-60 ${
                        isVisible
                          ? 'border-bloom/30 bg-white text-bloom hover:bg-bloom/10'
                          : 'border-sage/40 bg-white text-sage hover:bg-sage/15'
                      }`}
                      title={isVisible ? 'Deactivate category' : 'Make category live'}
                    >
                      {busyId === cat.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : isVisible ? (
                        <span>Deactivate</span>
                      ) : (
                        <span>Activate</span>
                      )}
                    </button>
                  </div>
                )}
              </article>
            )
          })}
        </div>
      )}
    </section>
  )
}

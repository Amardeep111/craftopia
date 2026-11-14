'use client'

import { useEffect, useState } from 'react'
import {
  Tag,
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
  Palette,
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
  { name: 'peach', hex: '#F4C2A1', label: 'Peach' },
  { name: 'sky', hex: '#A8C5DA', label: 'Sky' },
  { name: 'sand', hex: '#E6DDD3', label: 'Sand' },
  { name: 'ivory', hex: '#FBF8F3', label: 'Ivory' },
]

function resolveColorHex(val) {
  if (!val) return '#E8B4B8'
  const trimmed = String(val).toLowerCase().trim()
  const found = PRESET_ACCENTS.find((p) => p.name === trimmed)
  if (found) return found.hex
  if (/^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(trimmed)) {
    if (trimmed.length === 4) {
      return '#' + trimmed[1] + trimmed[1] + trimmed[2] + trimmed[2] + trimmed[3] + trimmed[3]
    }
    return trimmed
  }
  return '#E8B4B8'
}

function toSlug(text) {
  return (text || '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)+/g, '')
}

function CategoryEditor({ initial, onCancel, onSaved, onDelete }) {
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
        <div role="status" className="flex items-center gap-2 rounded-xl bg-sage/20 p-3 text-sm font-medium text-brand">
          <CheckCircle2 className="h-4 w-4 text-sage shrink-0" />
          <span>{notice}</span>
        </div>
      )}

      {error && (
        <div role="alert" className="flex items-start gap-2 rounded-xl bg-bloom/10 p-3 text-sm text-accent">
          <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {/* Name and Slug */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="block text-xs font-semibold tracking-normal text-brand" htmlFor="cat-name">
            Category Name <span className="text-accent">*</span>
          </label>
          <input
            id="cat-name"
            required
            value={form.name}
            onChange={(e) => handleNameChange(e.target.value)}
            placeholder="e.g. Crochet Flowers"
            className="mt-1.5 w-full rounded-xl border border-sand bg-surface px-3.5 py-2.5 text-sm text-brand placeholder:text-muted focus:border-bloom focus:outline-none focus:ring-2 focus:ring-bloom/20"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold tracking-normal text-brand" htmlFor="cat-slug">
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
            className="mt-1.5 w-full rounded-xl border border-sand bg-surface px-3.5 py-2.5 font-mono text-sm text-brand placeholder:font-sans placeholder:text-muted focus:border-bloom focus:outline-none focus:ring-2 focus:ring-bloom/20"
          />
          <p className="mt-1 text-[11px] text-muted">
            Storefront link: <code className="font-mono text-brand">/shop?category={form.slug || 'slug'}</code>
          </p>
        </div>
      </div>

      {/* Description */}
      <div>
        <label className="block text-xs font-semibold tracking-normal text-brand" htmlFor="cat-desc">
          Description
        </label>
        <textarea
          id="cat-desc"
          value={form.description}
          onChange={(e) => update('description', e.target.value)}
          rows={3}
          placeholder="Brief description for category listings and SEO..."
          className="mt-1.5 w-full rounded-xl border border-sand bg-surface px-3.5 py-2.5 text-sm text-brand placeholder:text-muted focus:border-bloom focus:outline-none focus:ring-2 focus:ring-bloom/20"
        />
      </div>

      {/* Image Preview & Upload */}
      <div>
        <label className="block text-xs font-semibold tracking-normal text-brand">
          Category Card Image
        </label>
        <div className="mt-2 flex flex-col sm:flex-row items-start gap-4">
          {/* Image Thumbnail */}
          <div className="relative h-32 w-28 shrink-0 overflow-hidden rounded-lg bg-ivory ring-1 ring-sand flex items-center justify-center">
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
              <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-plum/30 bg-surface px-4 py-2 text-sm font-semibold text-brand hover:bg-ivory transition shadow-sm">
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
                  <Loader2 className="h-3.5 w-3.5 animate-spin text-brand" />
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
                className="w-full rounded-xl border border-sand bg-surface px-3 py-2 text-xs text-brand placeholder:text-muted focus:border-bloom focus:outline-none focus:ring-1 focus:ring-bloom/20"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Accent Color and Order */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="block text-xs font-semibold tracking-normal text-brand">
              Accent Color
            </label>
            {form.accent && (
              <span className="text-[11px] font-mono text-muted">
                Active: <strong className="text-brand">{form.accent}</strong>
              </span>
            )}
          </div>

          {/* Preset Dropdown */}
          <select
            aria-label="Select accent theme color"
            value={PRESET_ACCENTS.some((p) => p.name === (form.accent || '').toLowerCase()) ? (form.accent || '').toLowerCase() : form.accent ? 'custom' : ''}
            onChange={(e) => {
              const val = e.target.value
              if (val && val !== 'custom') {
                update('accent', val)
              }
            }}
            className="w-full rounded-xl border border-sand bg-surface px-3.5 py-2 text-xs text-brand font-medium focus:border-bloom focus:outline-none focus:ring-1 focus:ring-bloom/20"
          >
            <option value="">Choose a theme palette color…</option>
            {PRESET_ACCENTS.map((preset) => (
              <option key={preset.name} value={preset.name}>
                {preset.label} ({preset.hex})
              </option>
            ))}
            <option value="custom">Custom Color / Hex Code</option>
          </select>

          {/* Color Picker Swatch & Manual Input */}
          <div className="flex items-center gap-2">
            {/* Visual Color Picker (Clickable Swatch that opens native color picker) */}
            <div className="relative shrink-0">
              <input
                type="color"
                id="cat-color-picker"
                value={resolveColorHex(form.accent)}
                onChange={(e) => update('accent', e.target.value)}
                className="sr-only"
                title="Open color picker palette"
              />
              <label
                htmlFor="cat-color-picker"
                className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-xl border-2 border-sand shadow-sm transition hover:scale-105 active:scale-95"
                style={{ backgroundColor: resolveColorHex(form.accent) }}
                title="Click to open color picker"
              >
                <Palette className="h-4 w-4 text-black/50 drop-shadow-[0_1px_1px_rgba(255,255,255,0.8)]" />
              </label>
            </div>

            {/* Direct Text Input */}
            <input
              value={form.accent}
              onChange={(e) => update('accent', e.target.value)}
              placeholder="e.g. blush, #E8B4B8, or pick with palette"
              className="flex-1 rounded-xl border border-sand bg-surface px-3.5 py-2 text-xs font-mono text-brand placeholder:font-sans placeholder:text-muted focus:border-bloom focus:outline-none focus:ring-1 focus:ring-bloom/20"
            />
          </div>

          {/* Quick Swatches Chips */}
          <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
            {PRESET_ACCENTS.slice(0, 6).map((preset) => {
              const selected = (form.accent || '').toLowerCase() === preset.name
              return (
                <button
                  key={preset.name}
                  type="button"
                  onClick={() => update('accent', preset.name)}
                  className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[10px] font-medium transition ring-1 ${
                    selected
                      ? 'ring-2 ring-plum bg-surface font-semibold text-brand shadow-sm'
                      : 'ring-sand/70 bg-surface/70 text-muted hover:bg-surface'
                  }`}
                >
                  <span
                    className="h-2 w-2 rounded-full ring-1 ring-black/10"
                    style={{ backgroundColor: preset.hex }}
                    aria-hidden="true"
                  />
                  <span>{preset.label}</span>
                </button>
              )
            })}
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold tracking-normal text-brand" htmlFor="cat-order">
            Display Sort Order
          </label>
          <input
            id="cat-order"
            type="number"
            min={0}
            value={form.order}
            onChange={(e) => update('order', e.target.value)}
            className="mt-1.5 w-full rounded-xl border border-sand bg-surface px-3.5 py-2 text-sm text-brand focus:border-bloom focus:outline-none focus:ring-1 focus:ring-bloom/20"
          />
          <p className="mt-1 text-[11px] text-muted">
            Lower numbers appear first in the shop navigation (e.g. 0, 1, 2).
          </p>
        </div>
      </div>

      {/* Visibility Settings */}
      <div className="rounded-lg bg-surface border border-sand/80 p-4 space-y-3">
        <p className="text-xs font-semibold tracking-normal text-brand">Storefront Visibility</p>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="flex items-start gap-3 rounded-xl border border-sand/70 bg-surface p-3 cursor-pointer hover:border-plum/30 transition">
            <input
              type="checkbox"
              checked={form.published}
              onChange={(e) => update('published', e.target.checked)}
              className="mt-0.5 h-4 w-4 rounded accent-plum"
            />
            <div className="text-xs">
              <span className="font-semibold text-brand block">Published</span>
              <span className="text-muted text-[11px]">Active on the store and visible in search filters.</span>
            </div>
          </label>

          <label className="flex items-start gap-3 rounded-xl border border-sand/70 bg-surface p-3 cursor-pointer hover:border-plum/30 transition">
            <input
              type="checkbox"
              checked={form.hidden}
              onChange={(e) => update('hidden', e.target.checked)}
              className="mt-0.5 h-4 w-4 rounded accent-plum"
            />
            <div className="text-xs">
              <span className="font-semibold text-brand block">Hidden from navigation</span>
              <span className="text-muted text-[11px]">Only accessible directly via URL; hidden from top shelves.</span>
            </div>
          </label>
        </div>
      </div>

      {/* Modal Actions */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-sand/70 pt-4">
        {isEditing && onDelete ? (
          <button
            type="button"
            onClick={() => onDelete(initial)}
            className="inline-flex min-h-11 items-center gap-1.5 rounded-full border border-bloom/40 px-4 text-xs font-semibold text-accent hover:bg-bloom/10 transition"
          >
            <Trash2 className="h-4 w-4" />
            <span>Delete Category</span>
          </button>
        ) : <div />}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="min-h-11 rounded-full border border-sand bg-surface px-5 text-sm font-semibold text-brand hover:bg-ivory transition"
          >
            Cancel
          </button>
          <button
            disabled={saving || uploading}
            type="submit"
            className="min-h-11 inline-flex items-center gap-2 rounded-lg bg-plum px-6 text-sm font-semibold text-on-primary shadow-none hover:bg-overlay-ink transition disabled:opacity-60"
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
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState('')
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

  async function confirmDeleteCategory() {
    if (!deleteTarget) return
    setDeleting(true)
    setDeleteError('')
    try {
      const response = await fetch(`/api/admin/categories/${encodeURIComponent(deleteTarget.id)}`, {
        method: 'DELETE',
      })
      const result = await response.json()
      if (!response.ok || !result.success) throw new Error(result.error || 'Failed to delete category.')
      setDeleteTarget(null)
      setEditorOpen(false)
      await load()
    } catch (e) {
      setDeleteError(e.message || 'Failed to delete category.')
    } finally {
      setDeleting(false)
    }
  }

  return (
    <section className="space-y-6">
      {/* Header bar */}
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-semibold text-ink">Categories</h1>
          <p className="mt-1 text-sm text-muted">
            Organize handcrafted products into collections displayed on the storefront.
          </p>
        </div>
        {can('categories.manage') && (
          <button
            type="button"
            onClick={handleOpenCreate}
            className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-plum px-5 text-sm font-semibold text-on-primary shadow-none hover:bg-overlay-ink transition"
          >
            <FolderPlus className="h-4 w-4" />
            <span>Add Category</span>
          </button>
        )}
      </header>

      {error && (
        <div role="alert" className="flex items-center gap-2 rounded-xl bg-bloom/10 p-3 text-sm text-accent">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Category Editor Modal (Always centered, zero auto-scroll jump) */}
      <Modal
        open={editorOpen}
        resizable
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
          onDelete={(cat) => {
            setDeleteError('')
            setDeleteTarget(cat)
          }}
        />
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        open={Boolean(deleteTarget)}
        onClose={() => {
          if (!deleting) setDeleteTarget(null)
        }}
        title="Delete Category"
        maxWidth="max-w-md"
      >
        <div className="space-y-4">
          <p className="text-sm text-brand leading-relaxed">
            Are you sure you want to delete <strong className="font-semibold text-brand">{deleteTarget?.name}</strong>?
          </p>
          <div className="rounded-xl bg-bloom/10 border border-bloom/20 p-3 text-xs text-accent leading-relaxed">
            <strong>Warning:</strong> Deleting this category will remove it and all associated products from the storefront and admin catalog.
          </div>
          {deleteError && (
            <div role="alert" className="flex items-center gap-2 rounded-xl bg-bloom/10 p-3 text-xs text-accent">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{deleteError}</span>
            </div>
          )}
          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              disabled={deleting}
              onClick={() => setDeleteTarget(null)}
              className="min-h-10 rounded-full border border-sand bg-surface px-4 text-xs font-semibold text-brand hover:bg-ivory transition disabled:opacity-60"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={deleting}
              onClick={confirmDeleteCategory}
              className="min-h-10 inline-flex items-center gap-1.5 rounded-full bg-bloom px-5 text-xs font-semibold text-on-primary shadow-none hover:bg-overlay-ink transition disabled:opacity-60"
            >
              {deleting ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  <span>Deleting…</span>
                </>
              ) : (
                <>
                  <Trash2 className="h-3.5 w-3.5" />
                  <span>Delete Category</span>
                </>
              )}
            </button>
          </div>
        </div>
      </Modal>

      {/* Grid of Categories */}
      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 6 }).map((_, idx) => (
            <div key={idx} className="h-32 rounded-lg bg-ivory/70 animate-pulse border border-sand/50" />
          ))}
        </div>
      ) : categories.length === 0 ? (
        <div className="rounded-lg bg-surface p-12 text-center border border-sand">
          <p className="font-display text-lg text-brand">No categories found</p>
          <p className="mt-1 text-sm text-muted">Click "+ Add Category" above to create your first collection.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {categories.map((cat) => {
            const isVisible = cat.published && !cat.hidden
            const isHiddenOnly = cat.published && cat.hidden

            return (
              <article key={cat.id} className="studio-admin-catalog-item">
                <div className="studio-admin-thumbnail">
                  {cat.image ? <img src={cat.image} alt={cat.name} loading="lazy" className="h-full w-full object-contain" /> : <div className="flex h-full items-center justify-center text-muted"><Tag className="h-6 w-6" aria-hidden="true" /></div>}
                </div>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="break-words text-base font-semibold text-ink">{cat.name}</h2>
                    <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${isVisible ? 'bg-success-surface text-success' : isHiddenOnly ? 'bg-warning-surface text-warning' : 'bg-ivory text-muted'}`}>{isVisible ? 'Live' : isHiddenOnly ? 'Hidden' : 'Inactive'}</span>
                  </div>
                  <p className="mt-1 text-xs text-muted">Category: {cat.name}</p>
                  <p className="mt-2 line-clamp-2 text-sm text-muted">{cat.description || 'No description provided.'}</p>
                  <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-muted"><span>Order #{cat.order ?? 0}</span>{cat.accent && <span className="inline-flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full ring-1 ring-sand" style={{backgroundColor: resolveColorHex(cat.accent)}} aria-hidden="true" />{cat.accent}</span>}</div>
                </div>

                {/* Card Actions */}
                {can('categories.manage') && (
                  <div className="studio-admin-catalog-actions">
                    <button
                      type="button"
                      onClick={() => handleOpenEdit(cat)}
                      className="inline-flex min-h-10 flex-1 items-center justify-center gap-1.5 rounded-xl border border-sand bg-surface px-3 text-sm font-semibold text-brand hover:bg-ivory transition shadow-sm"
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
                          ? 'border-bloom/30 bg-surface text-accent hover:bg-bloom/10'
                          : 'border-sage/40 bg-surface text-success hover:bg-success-surface'
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
                    <button
                      type="button"
                      onClick={() => {
                        setDeleteError('')
                        setDeleteTarget(cat)
                      }}
                      className="inline-flex min-h-10 items-center justify-center rounded-xl border border-bloom/30 bg-surface px-3 text-sm font-semibold text-accent hover:bg-bloom/10 transition shadow-sm"
                      title="Delete category"
                      aria-label={`Delete ${cat.name}`}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
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

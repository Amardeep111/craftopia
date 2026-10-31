'use client'

import { useEffect, useState, useRef } from 'react'
import { useAdminAccess } from '../access-context'
import { uploadProductImage } from '@/lib/images'

const emptyCategory = {
  name: '', slug: '', description: '', accent: '', image: '', order: '0'
}

function CategoryEditor({ initial, onCancel, onSaved }) {
  const [form, setForm] = useState(() => ({ ...emptyCategory, published: true, hidden: false, ...initial, order: String(initial?.order ?? 0), description: initial?.description || '', accent: initial?.accent || '', image: initial?.image || '', slug: initial?.slug || '', published: initial?.published !== false, hidden: initial?.hidden === true }))
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [notice, setNotice] = useState('')
  const isEditing = Boolean(initial?.id)

  function update(field, value) { setForm(current => ({ ...current, [field]: value })) }

  async function uploadImage(file) {
    setUploading(true)
    try {
      const uploadResult = await uploadProductImage(file, isEditing && initial?.id ? initial.id : 'categories')
      update('image', uploadResult.url)
    } catch (e) { setError(e.message || 'Image upload failed.') }
    finally { setUploading(false) }
  }

  async function submit(event) {
    event.preventDefault(); setError(''); setNotice(''); setSaving(true)
    const payload = { ...form, order: Number(form.order), published: form.published === true, hidden: form.hidden === true }
    try {
      const response = await fetch('/api/admin/categories', {
        method: isEditing ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(isEditing ? { id: initial.id, ...payload } : payload)
      })
      const result = await response.json()
      if (!response.ok || !result.success) throw new Error(result.error || 'Could not save.')
      setNotice(isEditing ? 'Category updated.' : 'Category created.')
      await onSaved()
    } catch (e) { setError(e.message || 'Could not save.') }
    finally { setSaving(false) }
  }

  return <form onSubmit={submit} className="space-y-5 rounded-2xl bg-white p-5 shadow-soft ring-1 ring-sand">
    <div className="flex items-start justify-between gap-3"><h2 className="font-display text-xl text-plum">{isEditing ? `Edit ${form.name}` : 'Add category'}</h2><button type="button" onClick={onCancel} className="min-h-10 rounded-xl border border-sand px-3 text-sm font-medium text-plum">Close</button></div>
    {notice && <p className="rounded-xl bg-sage/20 p-3 text-sm text-plum">{notice}</p>}
    <div className="grid gap-4 sm:grid-cols-2">
      <label className="block text-sm font-medium text-plum">Name
        <input required value={form.name} onChange={e => update('name', e.target.value)} className="mt-1.5 w-full rounded-xl border border-sand bg-white px-3 py-2 text-sm text-plum" />
      </label>
      <label className="block text-sm font-medium text-plum">Slug
        <input value={form.slug} onChange={e => update('slug', e.target.value)} placeholder="auto from name" className="mt-1.5 w-full rounded-xl border border-sand bg-white px-3 py-2 text-sm text-plum" />
      </label>
    </div>
    <label className="block text-sm font-medium text-plum">Description
      <textarea value={form.description} onChange={e => update('description', e.target.value)} rows={2} className="mt-1.5 w-full rounded-xl border border-sand bg-white px-3 py-2 text-sm text-plum" />
    </label>
    <div className="grid gap-4 sm:grid-cols-3">
      <label className="block text-sm font-medium text-plum">Accent color
        <input value={form.accent} onChange={e => update('accent', e.target.value)} placeholder="e.g. blush" className="mt-1.5 w-full rounded-xl border border-sand bg-white px-3 py-2 text-sm text-plum" />
      </label>
      <label className="block text-sm font-medium text-plum">Image URL / upload
        <div className="mt-1.5 flex gap-2">
          <input value={form.image} onChange={e => update('image', e.target.value)} placeholder="https://… or upload below" className="flex-1 min-h-10 rounded-xl border border-sand bg-white px-3 py-2 text-sm text-plum" />
          <label className="shrink-0 inline-flex cursor-pointer items-center rounded-full bg-plum px-4 py-2 text-sm font-semibold text-cream hover:bg-plum/90"><input type="file" accept="image/jpeg,image/png,image/webp" onChange={e => { if (e.target.files?.[0]) uploadImage(e.target.files[0]); e.target.value = '' }} className="sr-only" />Choose file</label>
        </div>
        {uploading && <p className="mt-1 text-xs text-muted">Uploading…</p>}
      </label>
      <label className="block text-sm font-medium text-plum">Order
        <input type="number" min={0} value={form.order} onChange={e => update('order', e.target.value)} className="mt-1.5 w-full rounded-xl border border-sand bg-white px-3 py-2 text-sm text-plum" />
      </label>
    </div>
    <fieldset className="rounded-xl bg-cream p-4 ring-1 ring-sand">
      <legend className="px-1 text-sm font-medium text-plum">Visibility</legend>
      <div className="flex flex-wrap gap-5">
        <label className="flex items-center gap-2 text-sm text-plum">
          <input type="checkbox" checked={form.published} onChange={e => update('published', e.target.checked)} className="h-4 w-4 accent-plum" />
          Published
        </label>
        <label className="flex items-center gap-2 text-sm text-plum">
          <input type="checkbox" checked={form.hidden} onChange={e => update('hidden', e.target.checked)} className="h-4 w-4 accent-plum" />
          Hidden from customers
        </label>
      </div>
      <p className="mt-2 text-xs text-muted">Unpublishing or hiding keeps the category in the admin panel but removes it from customer listings.</p>
    </fieldset>
    <div className="flex justify-end gap-3 border-t border-sand pt-4">
      <button type="button" onClick={onCancel} className="min-h-11 rounded-full border border-sand px-5 font-medium text-plum">Cancel</button>
      <button disabled={saving} type="submit" className="min-h-11 rounded-full bg-plum px-6 font-semibold text-cream disabled:opacity-60">{saving ? 'Saving...' : isEditing ? 'Save changes' : 'Add category'}</button>
    </div>
  </form>
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
      if (data.success) setCategories(data.data); else setError(data.error || 'Failed to load categories.')
    } catch { setError('Failed to load categories.') }
    finally { setLoading(false) }
  }

  useEffect(() => { load() }, [])

  async function toggleVisibility(cat) {
    setBusyId(cat.id); setError('')
    const newPublished = !cat.published
    const newHidden = newPublished ? false : true
    try {
      const response = await fetch('/api/admin/categories', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: cat.id, published: newPublished, hidden: newHidden })
      })
      const result = await response.json()
      if (!response.ok || !result.success) throw new Error(result.error || 'Could not update category.')
      await load()
    } catch (e) { setError(e.message || 'Could not update category.') }
    finally { setBusyId(null) }
  }

  return <section className="space-y-6">
    <header className="flex flex-wrap items-start justify-between gap-4"><h1 className="font-display text-3xl text-plum">Categories</h1>{can('categories.manage') && <button onClick={() => { setEditorCategory(null); setEditorOpen(true); setError('') }} className="min-h-11 rounded-full bg-plum px-5 font-semibold text-cream">+ Add category</button>}</header>
    {error && <p className="rounded-xl bg-bloom/10 p-3 text-sm text-bloom">{error}</p>}
    {editorOpen && <CategoryEditor initial={editorCategory} onCancel={() => setEditorOpen(false)} onSaved={async () => { setEditorOpen(false); await load() }} />}
    {loading ? <p>Loading...</p> : <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {categories.map(cat => {
        const visible = cat.published && !cat.hidden
        return <article key={cat.id} className={`min-w-0 overflow-hidden rounded-2xl bg-cream p-5 shadow-soft ring-1 ${visible ? 'ring-sand' : 'ring-bloom/30 opacity-70'}`}>
          <div className="relative block aspect-[4/5] overflow-hidden rounded-2xl bg-gradient-to-br from-blush/40 to-lavender/30">
            {cat.image ? <img src={cat.image} alt={cat.name} className="h-full w-full object-cover" /> : <div className="flex h-full items-center justify-center"><svg viewBox="0 0 120 120" aria-hidden="true" className="h-24 w-24 opacity-70"><circle cx="60" cy="60" r="44" fill="none" stroke="#D9CDE8" strokeWidth="3"/><circle cx="60" cy="60" r="30" fill="none" stroke="#E8B4B8" strokeWidth="3"/><circle cx="60" cy="60" r="16" fill="none" stroke="#7A645C" strokeWidth="3"/></svg></div>}
            <span className="absolute left-3 top-3 rounded-full bg-cream/90 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-plum">Handmade</span>
          </div>
          <div className="flex items-start justify-between gap-2 pt-4">
            <h2 className="font-display text-xl text-plum">{cat.name}</h2>
            <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold ${visible ? 'bg-sage/30 text-plum' : 'bg-bloom/15 text-bloom'}`}>{visible ? 'Visible' : 'Not listed'}</span>
          </div>
          <p className="text-xs text-muted">slug: {cat.slug}</p>
          <p className="mt-1 text-sm text-muted">{cat.description || 'No description'}</p>
          <div className="mt-3 flex gap-2 text-xs text-muted">
            <span>Accent: {cat.accent || '-'}</span>
            <span>Order: {cat.order}</span>
          </div>
          {can('categories.manage') && <div className="mt-3 flex gap-2">
            <button onClick={() => { setEditorCategory(cat); setEditorOpen(true); setError('') }} className="min-h-10 flex-1 rounded-xl border border-plum/30 bg-white px-4 font-semibold text-plum hover:bg-blush/30">Edit</button>
            <button disabled={busyId === cat.id} onClick={() => toggleVisibility(cat)} className="min-h-10 rounded-xl border border-plum/30 bg-white px-4 text-sm font-semibold text-plum hover:bg-blush/30 disabled:opacity-60">{visible ? 'Deactivate' : 'Activate'}</button>
          </div>}
        </article>
      })}
    </div>}
  </section>
}

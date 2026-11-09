'use client'
import ProductImage from '@/components/ui/ProductImage'
import { uploadProductImage } from '@/lib/images'

import { useEffect, useRef, useState } from 'react'
import { useAdminAccess } from '../access-context'
import { indiaStates } from '@/lib/india-states'
import MarkdownEditor from '../components/MarkdownEditor'
import AdminPagination from '../components/AdminPagination'
import Modal from '@/components/ui/Modal'
import { Trash2, Loader2, AlertCircle } from 'lucide-react'

const emptyProduct = {
  name: '', slug: '', categoryId: '', price: '0', discountPercent: '0', gstPercent: '0', codFee: '0', otherCharge: '0',
  stock: '0', short: '', description: '', materials: '', care: '', customization: '', visual: '', imageUrl: '', images: [],
  unavailableStates: [], unavailablePinCodes: '', allowedPaymentMethods: ['upi'], featured: false, published: true, availableForSale: true,
}
const money = (value) => `₹${Number(value || 0).toLocaleString('en-IN')}`
const listValue = (value) => (Array.isArray(value) ? value.join(', ') : '')
const visuals = [['teddy', 'Teddy'], ['bunny', 'Bunny'], ['flower', 'Flower'], ['bouquet', 'Bouquet'], ['keychain', 'Keychain'], ['bandana', 'Bandana'], ['gift', 'Gift'], ['heart', 'Heart'], ['pins', 'Pins'], ['yarn', 'Yarn']]

function MultiSelect({ label, options, values, onChange }) {
  const [open, setOpen] = useState(false)
  const rootRef = useRef(null)

  useEffect(() => {
    if (!open) return
    function closeOutside(event) {
      if (!rootRef.current?.contains(event.target)) setOpen(false)
    }
    function closeOnEscape(event) {
      if (event.key === 'Escape') setOpen(false)
    }
    document.addEventListener('pointerdown', closeOutside)
    document.addEventListener('keydown', closeOnEscape)
    return () => {
      document.removeEventListener('pointerdown', closeOutside)
      document.removeEventListener('keydown', closeOnEscape)
    }
  }, [open])

  return <div ref={rootRef} className="relative block min-w-0 text-sm font-medium text-plum">
    <span className="mb-1.5 block text-sm font-medium text-plum">{label}</span>
    <button type="button" aria-expanded={open} aria-controls="unavailable-states-options" onClick={() => setOpen((current) => !current)} className="flex min-h-11 w-full items-center justify-between gap-3 rounded-xl border border-sand bg-white px-3 py-2 text-left hover:border-plum/40 focus:outline-none focus:ring-2 focus:ring-bloom/30">
      <span className="truncate">{values.length ? values.join(', ') : 'Choose states'}</span><span className="shrink-0 text-xs text-muted">{values.length ? `${values.length} selected` : 'Optional'} <span aria-hidden="true" className="ml-1">{open ? '▴' : '▾'}</span></span>
    </button>
    {open && <div id="unavailable-states-options" role="group" aria-label={label} className="absolute left-0 right-0 top-full z-30 mt-1 max-h-64 overflow-auto rounded-xl border border-sand bg-white p-2 shadow-lift sm:grid sm:grid-cols-2">
      {options.map((option) => <label key={option} className="flex min-h-10 cursor-pointer items-center gap-2 rounded-lg px-2 py-2 text-sm hover:bg-ivory"><input type="checkbox" checked={values.includes(option)} onChange={(event) => onChange(event.target.checked ? [...values, option] : values.filter((value) => value !== option))} className="h-4 w-4 shrink-0 accent-plum" />{option}</label>)}
    </div>}
    <span className="mt-1 block min-h-4 text-xs font-normal text-muted">{values.length ? 'Click to change selected states.' : 'No state restrictions selected.'}</span>
  </div>
}

function ProductEditor({ initial, categories, onCancel, onSaved, onDelete }) {
  const [form, setForm] = useState(() => initial ? {
    ...emptyProduct,
    ...initial,
    price: String(initial.price ?? 0), discountPercent: String(initial.discountPercent ?? 0), gstPercent: String(initial.gstPercent ?? 0),
    codFee: String(initial.codFee ?? 0), otherCharge: String(initial.otherCharge ?? 0), stock: String(initial.stock ?? 0),
    imageUrl: typeof initial.imageUrl === 'string' ? initial.imageUrl : '',
    unavailableStates: Array.isArray(initial.unavailableStates) ? initial.unavailableStates : [], unavailablePinCodes: listValue(initial.unavailablePinCodes),
    images: [...new Set([...(Array.isArray(initial.images) ? initial.images.filter((url) => typeof url === 'string') : []), ...(initial.imageUrl ? [initial.imageUrl] : [])])],
    allowedPaymentMethods: Array.isArray(initial.allowedPaymentMethods) ? initial.allowedPaymentMethods : ['upi'],
  } : { ...emptyProduct, categoryId: categories[0]?.id || '' })
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [notice, setNotice] = useState('')
  const isEditing = Boolean(initial?.id)

  useEffect(() => {
    if (!form.categoryId && categories.length) setForm((current) => ({ ...current, categoryId: categories[0].id }))
  }, [categories, form.categoryId])

  function update(field, value) { setForm((current) => ({ ...current, [field]: value })) }
  async function uploadImages(files) {
    if (!files?.length) return
    setError(''); setUploading(true)
    try {
      const selected = [...files]
      if (form.images.length + selected.length > 8) throw new Error('A product can have up to 8 gallery images.')
      if (selected.some((file) => file.size > 15 * 1024 * 1024 || !['image/jpeg', 'image/png', 'image/webp'].includes(file.type))) throw new Error('Choose JPEG, PNG, or WebP photos, each no larger than 15 MB.')
      const results = await Promise.allSettled(selected.map(async (file) => {
        const uploadResult = await uploadProductImage(file, initial?.id)
        return uploadResult.url
      }))
      const uploads = results.filter((result) => result.status === 'fulfilled').map((result) => result.value)
      if (!uploads.length) throw results.find((result) => result.status === 'rejected')?.reason || new Error('Image upload failed.')
      setForm((current) => { const images = [...new Set([...current.images, ...uploads])]; return { ...current, images, imageUrl: images[0] || '' } })
      if (uploads.length !== selected.length) throw new Error(`${uploads.length} photo${uploads.length === 1 ? '' : 's'} uploaded; one or more files could not be saved. You can retry the missing photos.`)
    } catch (cause) { setError(cause.message || 'Image upload failed.') }
    finally { setUploading(false) }
  }
  function field(name, label, options = {}) {
    return <label className="block text-sm font-medium text-plum">{label}
      <input aria-label={label} required={options.required} type={options.type || 'text'} min={options.min} max={options.max} step={options.step} value={form[name] ?? ''} onChange={(event) => update(name, event.target.value)} placeholder={options.placeholder} className="mt-1.5 min-h-11 w-full rounded-xl border border-sand bg-white px-3 py-2 text-sm text-plum outline-none focus:border-bloom focus:ring-2 focus:ring-bloom/20" />
    </label>
  }
  function textarea(name, label, required = false) {
    return <label className="block text-sm font-medium text-plum">{label}<textarea aria-label={label} required={required} rows={3} value={form[name] ?? ''} onChange={(event) => update(name, event.target.value)} className="mt-1.5 w-full rounded-xl border border-sand bg-white px-3 py-2 text-sm text-plum outline-none focus:border-bloom focus:ring-2 focus:ring-bloom/20" /></label>
  }
  function markdownField(name, label, required = false) {
    return <div className="block text-sm font-medium text-plum"><MarkdownEditor id={`product-${name}`} label={label} value={form[name] ?? ''} onChange={(value) => update(name, value)} rows={4} required={required} /></div>
  }

  async function submit(event) {
    event.preventDefault(); setError(''); setNotice(''); setSaving(true)
    const payload = {
      ...form,
      price: Number(form.price), discountPercent: Number(form.discountPercent), gstPercent: Number(form.gstPercent),
      codFee: Number(form.codFee), otherCharge: Number(form.otherCharge), stock: Number(form.stock),
      imageUrl: typeof form.imageUrl === 'string' ? form.imageUrl.trim() : '',
      unavailablePinCodes: form.unavailablePinCodes.split(',').map((value) => value.trim()).filter(Boolean),
    }
    try {
      if (!payload.allowedPaymentMethods.length) throw new Error('Select at least one accepted payment method.')
      const response = await fetch('/api/admin/products', {
        method: isEditing ? 'PATCH' : 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(isEditing ? { id: initial.id, ...payload } : payload),
      })
      const result = await response.json()
      if (!response.ok || !result.success) throw new Error(result.error || 'Could not save this product.')
      setNotice(isEditing ? 'Product changes saved.' : 'Product added to your catalog.')
      await onSaved()
    } catch (cause) { setError(cause.message || 'Could not save this product.') }
    finally { setSaving(false) }
  }

  return <form onSubmit={submit} className="space-y-6 rounded-2xl bg-cream p-4 shadow-soft ring-1 ring-sand sm:p-6">
    <div className="flex flex-wrap items-start justify-between gap-3"><div><h2 className="font-display text-2xl text-plum">{isEditing ? `Edit ${initial.name}` : 'Add a product'}</h2><p className="mt-1 text-sm text-muted">Manage the listing, inventory, price, tax, fees, and delivery availability.</p></div><button type="button" onClick={onCancel} className="min-h-10 rounded-xl border border-sand px-3 text-sm font-medium text-plum">Close</button></div>
    <label className={`flex min-h-14 items-center gap-3 rounded-xl border px-4 py-3 text-sm ${form.availableForSale ? 'border-sand bg-white' : 'border-bloom/40 bg-bloom/10'}`}><input type="checkbox" checked={!form.availableForSale} onChange={(event) => update('availableForSale', !event.target.checked)} className="h-5 w-5 accent-plum" /><span><strong className="block text-plum">Mark unavailable</strong><span className="text-xs text-muted">Pause new orders without changing stock or hiding the product. Save changes to apply.</span></span></label>
    {notice && <p role="status" className="rounded-xl bg-sage/20 p-3 text-sm text-plum">{notice}</p>}

    <section className="space-y-3"><h3 className="font-semibold text-plum">Product information</h3><div className="grid gap-4 sm:grid-cols-2">
      {field('name', 'Product name', { required: true })}{field('slug', 'Product URL (optional)', { placeholder: 'Created from the name if blank' })}
      <label className="block text-sm font-medium text-plum">Category<select aria-label="Category" required value={form.categoryId} onChange={(event) => update('categoryId', event.target.value)} className="mt-1.5 min-h-11 w-full rounded-xl border border-sand bg-white px-3 py-2 text-sm"><option value="">Choose category</option>{categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</select></label>
      <div><p className="text-sm font-medium text-plum">Product photo gallery</p><div className="mt-1.5 rounded-2xl border-2 border-dashed border-sand bg-white p-4 text-center"><input id="product-image-files" aria-label="Upload product images" type="file" accept="image/jpeg,image/png,image/webp" multiple onChange={(event) => { uploadImages(event.target.files); event.target.value = '' }} className="sr-only" /><label htmlFor="product-image-files" className="inline-flex min-h-10 cursor-pointer items-center justify-center rounded-full bg-plum px-4 text-sm font-semibold text-cream">Choose product photos</label><p className="mt-2 text-xs text-muted">Upload up to 8 JPEG, PNG, or WebP images, max 4 MB each.</p>{uploading && <p role="status" className="mt-2 text-xs text-muted">Uploading images…</p>}</div>{form.images.length > 0 && <div className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-4">{form.images.map((url, index) => <div key={url} className="relative aspect-square overflow-hidden rounded-xl border border-sand bg-ivory"><img src={url} alt={`Product gallery image ${index + 1}`} className="h-full w-full object-cover" /><span className="absolute bottom-1 left-1 rounded-full bg-ink/75 px-2 py-0.5 text-[10px] text-white">{index === 0 ? 'Main photo' : `Photo ${index + 1}`}</span>{index > 0 && <button type="button" aria-label={`Make product photo ${index + 1} the main photo`} onClick={() => setForm((current) => { const images = [url, ...current.images.filter((item) => item !== url)]; return { ...current, images, imageUrl: url } })} className="absolute bottom-8 left-1 rounded-full bg-white/95 px-2 py-1 text-[10px] font-semibold text-plum shadow">Set as main</button>}<button type="button" aria-label={`Remove product photo ${index + 1}`} onClick={() => setForm((current) => { const images = current.images.filter((item) => item !== url); return { ...current, images, imageUrl: images[0] || '' } })} className="absolute right-1 top-1 rounded-full bg-white/95 px-2 py-1 text-xs font-bold text-plum shadow">×</button></div>)}</div>}{field('imageUrl', 'Main image URL (optional)', { placeholder: 'https://…' })}</div>
      <label className="block text-sm font-medium text-plum">Illustration style<select aria-label="Illustration style" value={form.visual} onChange={(event) => update('visual', event.target.value)} className="mt-1.5 min-h-11 w-full rounded-xl border border-sand bg-white px-3 py-2 text-sm"><option value="">Choose style</option>{visuals.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
    </div>{textarea('short', 'Short description', true)}{markdownField('description', 'Full description', true)}<div className="grid gap-4 sm:grid-cols-3">{markdownField('materials', 'Materials')}{markdownField('care', 'Care instructions')}{markdownField('customization', 'Customization options')}</div></section>

    <section className="space-y-3 border-t border-sand pt-5"><h3 className="font-semibold text-plum">Price and inventory</h3><div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
      {field('price', 'Price (₹)', { type: 'number', min: 0, required: true })}{field('discountPercent', 'Discount (%)', { type: 'number', min: 0, max: 90 })}{field('gstPercent', 'GST (%)', { type: 'number', min: 0, max: 100 })}{field('codFee', 'COD fee (₹)', { type: 'number', min: 0 })}{field('otherCharge', 'Other fee/item (₹)', { type: 'number', min: 0 })}{field('stock', 'Units in stock', { type: 'number', min: 0, required: true })}
    </div><p className="text-xs leading-5 text-muted">Stock is reduced automatically when orders are placed. At zero units, the product is out of stock; use “Available for purchase” below to pause ordering without changing inventory.</p></section>

    <section className="space-y-3 border-t border-sand pt-5"><h3 className="font-semibold text-plum">Listing and delivery</h3><div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      <label className="flex min-h-12 items-center gap-3 rounded-xl border border-sand bg-white px-3 text-sm"><input type="checkbox" checked={!!form.featured} onChange={(event) => update('featured', event.target.checked)} className="h-4 w-4 accent-plum" /><span><strong className="block text-plum">Featured product</strong><span className="text-xs text-muted">Promote this item in featured sections.</span></span></label>
      <label className="flex min-h-12 items-center gap-3 rounded-xl border border-sand bg-white px-3 text-sm"><input type="checkbox" checked={!!form.published} onChange={(event) => update('published', event.target.checked)} className="h-4 w-4 accent-plum" /><span><strong className="block text-plum">Show in shop</strong><span className="text-xs text-muted">Turn off to hide this listing from customers.</span></span></label>
    </div><div className="grid items-start gap-4 sm:grid-cols-2"><MultiSelect label="Unavailable in states" options={indiaStates} values={form.unavailableStates} onChange={(value) => update('unavailableStates', value)} />{field('unavailablePinCodes', 'Unavailable at PIN codes', { placeholder: 'Example: 110001, 560001' })}</div><p className="text-xs leading-5 text-muted">Leave both location fields empty for nationwide delivery. Choose one or more states and enter 6-digit PIN codes separated by commas. Checkout checks the saved delivery address and blocks orders in restricted locations.</p></section>

    <section className="space-y-3 border-t border-sand pt-5"><h3 className="font-semibold text-plum">Accepted payment methods</h3><div className="flex flex-wrap gap-3">
      {[['upi', 'UPI'], ['cod', 'Cash on Delivery']].map(([method, label]) => <label key={method} className="flex min-h-11 items-center gap-2 rounded-xl border border-sand bg-white px-3 text-sm text-plum"><input type="checkbox" checked={form.allowedPaymentMethods.includes(method)} onChange={(event) => update('allowedPaymentMethods', event.target.checked ? [...form.allowedPaymentMethods, method] : form.allowedPaymentMethods.filter((value) => value !== method))} className="h-4 w-4 accent-plum" />{label}</label>)}
    </div><p className="text-xs leading-5 text-muted">A cart containing multiple items only offers methods accepted by every item. UPI orders are marked as awaiting payment verification until an admin confirms the transfer.</p>{form.allowedPaymentMethods.length === 0 && <p role="alert" className="text-sm text-bloom">Select at least one payment method.</p>}</section>

    {error && <p role="alert" className="rounded-xl border border-bloom/30 bg-bloom/10 p-3 text-sm text-bloom">{error}</p>}
    <div className="flex flex-col-reverse gap-3 border-t border-sand pt-4 sm:flex-row sm:items-center sm:justify-between">
      {isEditing && onDelete ? (
        <button
          type="button"
          onClick={() => onDelete(initial)}
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-bloom/40 px-5 text-sm font-semibold text-bloom hover:bg-bloom/10 transition"
        >
          <Trash2 className="h-4 w-4" />
          <span>Delete product</span>
        </button>
      ) : <div />}
      <div className="flex flex-col-reverse gap-3 sm:flex-row">
        <button type="button" onClick={onCancel} className="min-h-11 rounded-full border border-sand px-5 font-medium text-plum">Cancel</button>
        <button disabled={saving || !categories.length} type="submit" className="min-h-11 rounded-full bg-plum px-6 font-semibold text-cream disabled:opacity-60">{saving ? 'Saving…' : isEditing ? 'Save product changes' : 'Add product'}</button>
      </div>
    </div>
  </form>
}

export default function AdminProducts() {
  const { can } = useAdminAccess()
  const canManage = can('products.manage')
  const [products, setProducts] = useState([])
  const [categories, setCategories] = useState([])
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(25)
  const [total, setTotal] = useState(0)
  const [pages, setPages] = useState(0)
  const [editorProduct, setEditorProduct] = useState(null)
  const [editorOpen, setEditorOpen] = useState(false)
  const [editingId, setEditingId] = useState('')
  const [search, setSearch] = useState('')
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const editorRef = useRef(null)

  useEffect(() => {
    if (!editorOpen) return
    const frame = requestAnimationFrame(() => editorRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }))
    return () => cancelAnimationFrame(frame)
  }, [editorOpen, editorProduct])

  async function load() {
    try {
      setLoading(true)
      const params = new URLSearchParams({ page: String(page), pageSize: String(pageSize) })
      if (search.trim()) params.set('search', search.trim())
      const productsResponse = await fetch(`/api/admin/products?${params}`, { cache: 'no-store' })
      const productResult = await productsResponse.json()
      if (!productsResponse.ok || !productResult.success) throw new Error(productResult.error || 'Could not load products.')
      setProducts(Array.isArray(productResult.data?.items) ? productResult.data.items : [])
      setTotal(productResult.data?.total || 0)
      setPages(productResult.data?.pages || 0)
      setError('')
    } catch (cause) { setError(cause.message || 'Could not load products.') }
    finally { setLoading(false) }
  }
  useEffect(() => {
    fetch('/api/categories', { cache: 'no-store' })
      .then((response) => response.json())
      .then((result) => setCategories(result.success && Array.isArray(result.data) ? result.data : []))
      .catch(() => setCategories([]))
  }, [])
  useEffect(() => {
    const timer = window.setTimeout(load, 250)
    return () => window.clearTimeout(timer)
  }, [page, pageSize, search])

  async function openEditor(product) {
    setError('')
    setEditingId(product.id)
    try {
      const response = await fetch(`/api/admin/products/${encodeURIComponent(product.id)}`, { cache: 'no-store' })
      const result = await response.json()
      if (!response.ok || !result.success) throw new Error(result.error || 'Could not load product details.')
      setEditorProduct(result.data)
      setEditorOpen(true)
    } catch (cause) {
      setError(cause.message || 'Could not load product details.')
    } finally {
      setEditingId('')
    }
  }

  async function confirmDeleteProduct() {
    if (!deleteTarget) return
    setDeleting(true)
    setDeleteError('')
    try {
      const response = await fetch(`/api/admin/products/${encodeURIComponent(deleteTarget.id)}`, {
        method: 'DELETE',
      })
      const result = await response.json()
      if (!response.ok || !result.success) throw new Error(result.error || 'Could not delete product.')
      setDeleteTarget(null)
      setEditorOpen(false)
      await load()
    } catch (cause) {
      setDeleteError(cause.message || 'Could not delete product.')
    } finally {
      setDeleting(false)
    }
  }

  function status(product) {
    if (!product.published) return { label: 'Hidden from shop', style: 'bg-ink/10 text-ink' }
    if (product.availableForSale === false) return { label: 'Unavailable for purchase', style: 'bg-ink/10 text-ink' }
    if (product.stock <= 0) return { label: 'Out of stock', style: 'bg-bloom/10 text-bloom' }
    if (product.stock <= 5) return { label: `Low stock · ${product.stock}`, style: 'bg-amber-100 text-amber-800' }
    return { label: 'Available', style: 'bg-sage/30 text-plum' }
  }

  return <section className="space-y-6">
    <header className="flex flex-wrap items-start justify-between gap-4"><div><h1 className="font-display text-3xl text-plum">Products</h1><p className="mt-1 text-sm text-muted">Create listings and manage pricing, inventory, taxes, fees, and delivery areas.</p></div>{canManage && <button onClick={() => { setEditorProduct(null); setEditorOpen(true); setError('') }} className="min-h-11 rounded-full bg-plum px-5 font-semibold text-cream shadow-soft">+ Add product</button>}</header>
    {error && <p role="alert" className="rounded-xl bg-bloom/10 p-3 text-sm text-bloom">{error}</p>}
    {editorOpen && (
      <div ref={editorRef} className="scroll-mt-24" tabIndex={-1} aria-label={editorProduct ? `Edit ${editorProduct.name}` : 'Add a product'}>
        <ProductEditor
          key={editorProduct?.id || 'new'}
          initial={editorProduct}
          categories={categories}
          onCancel={() => setEditorOpen(false)}
          onSaved={async () => {
            if (editorProduct) await load()
            else setPage(1)
            setEditorOpen(false)
          }}
          onDelete={(prod) => {
            setDeleteError('')
            setDeleteTarget(prod)
          }}
        />
      </div>
    )}
    <label className="block max-w-md text-sm text-muted">Search catalog<input value={search} onChange={(event) => { setPage(1); setSearch(event.target.value) }} placeholder="Product name, URL, or category" className="mt-1.5 min-h-11 w-full rounded-xl border border-sand bg-white px-3 text-sm text-plum" /></label>
    {loading ? <p role="status">Loading products…</p> : products.length === 0 ? <div className="rounded-2xl bg-cream p-8 text-center shadow-soft ring-1 ring-sand"><h2 className="font-display text-xl text-plum">{total ? 'No products on this page' : search.trim() ? 'No products match' : 'Your catalog is empty'}</h2><p className="mt-2 text-sm text-muted">{total || search.trim() ? 'Try another page or search.' : 'Add your first product to start building your store.'}</p></div> : <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{products.map((product) => {
      const currentStatus = status(product)
      const restrictedLocations = [...(product.unavailableStates || []), ...(product.unavailablePinCodes || [])]
      return <article key={product.id} className="min-w-0 overflow-hidden rounded-2xl bg-cream p-4 shadow-soft ring-1 ring-sand sm:p-5">
        <div className="relative block aspect-[4/5] overflow-hidden rounded-2xl bg-sand">
          <ProductImage src={product.imageUrl || product.images?.[0]} alt={product.name} visual={product.visual} palette={product.palette} className="h-full w-full" />
          <span className="absolute left-3 top-3 rounded-full bg-cream/90 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-plum">Handmade</span>
        </div>
        <div className="flex items-start justify-between gap-3 pt-4"><div className="min-w-0"><h2 className="break-words font-display text-xl text-plum">{product.name}</h2><p className="mt-1 break-all text-xs text-muted">{product.slug} · {product.category?.name || 'Uncategorized'}</p></div><span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold ${currentStatus.style}`}>{currentStatus.label}</span></div>
        <div className="mt-4 grid grid-cols-2 gap-x-4 gap-y-2 border-y border-sand py-3 text-sm"><span className="text-muted">Price</span><strong>{money(product.price)}</strong><span className="text-muted">Discount</span><strong>{product.discountPercent || 0}%</strong><span className="text-muted">GST</span><strong>{product.gstPercent || 0}%</strong><span className="text-muted">COD + other fees</span><strong>{money((product.codFee || 0) + (product.otherCharge || 0))}</strong><span className="text-muted">Inventory</span><strong>{product.stock} units</strong><span className="text-muted">Listing</span><strong>{product.published ? 'Published' : 'Hidden'}</strong><span className="text-muted">Purchasable</span><strong>{product.availableForSale === false ? 'Paused' : 'Yes'}</strong><span className="text-muted">Payment</span><strong>{(product.allowedPaymentMethods || ['upi']).map((method) => method.toUpperCase()).join(' + ')}</strong><span className="text-muted">Featured</span><strong>{product.featured ? 'Yes' : 'No'}</strong></div>
        <p className="mt-3 min-h-10 text-xs leading-5 text-muted">{restrictedLocations.length ? `Delivery blocked in: ${restrictedLocations.join(', ')}` : 'Delivery available across all locations.'}</p>
        {canManage && (
          <div className="mt-3 flex items-center gap-2">
            <button
              disabled={editingId === product.id}
              onClick={() => openEditor(product)}
              className="min-h-11 flex-1 rounded-xl border border-plum/30 bg-white px-4 font-semibold text-plum hover:bg-blush/30 disabled:opacity-60 transition"
            >
              {editingId === product.id ? 'Loading details…' : 'Edit product settings'}
            </button>
            <button
              type="button"
              onClick={() => {
                setDeleteError('')
                setDeleteTarget(product)
              }}
              className="min-h-11 inline-flex items-center justify-center rounded-xl border border-bloom/30 bg-white px-3.5 text-bloom hover:bg-bloom/10 transition"
              title="Delete product"
              aria-label={`Delete ${product.name}`}
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        )}
      </article>
    })}</div>}
    {!loading && <AdminPagination page={page} pageSize={pageSize} total={total} pages={pages} onPageChange={setPage} onPageSizeChange={(value) => { setPage(1); setPageSize(value) }} />}

    {/* Delete Confirmation Modal */}
    <Modal
      open={Boolean(deleteTarget)}
      onClose={() => {
        if (!deleting) setDeleteTarget(null)
      }}
      title="Delete Product"
      maxWidth="max-w-md"
    >
      <div className="space-y-4">
        <p className="text-sm text-plum leading-relaxed">
          Are you sure you want to delete <strong className="font-semibold text-plum">{deleteTarget?.name}</strong>?
        </p>
        <div className="rounded-xl bg-bloom/10 border border-bloom/20 p-3 text-xs text-bloom leading-relaxed">
          <strong>Notice:</strong> This will remove the product from the storefront and admin catalog.
        </div>
        {deleteError && (
          <div role="alert" className="flex items-center gap-2 rounded-xl bg-bloom/10 p-3 text-xs text-bloom">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{deleteError}</span>
          </div>
        )}
        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            type="button"
            disabled={deleting}
            onClick={() => setDeleteTarget(null)}
            className="min-h-10 rounded-full border border-sand bg-white px-4 text-xs font-semibold text-plum hover:bg-ivory transition disabled:opacity-60"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={deleting}
            onClick={confirmDeleteProduct}
            className="min-h-10 inline-flex items-center gap-1.5 rounded-full bg-bloom px-5 text-xs font-semibold text-cream shadow-soft hover:bg-ink transition disabled:opacity-60"
          >
            {deleting ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                <span>Deleting…</span>
              </>
            ) : (
              <>
                <Trash2 className="h-3.5 w-3.5" />
                <span>Delete Product</span>
              </>
            )}
          </button>
        </div>
      </div>
    </Modal>
  </section>
}

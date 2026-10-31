'use client'

import { useEffect, useState } from 'react'
import { useAdminAccess } from '../access-context'

const empty = { code: '', label: '', discountPercent: 10, minSubtotal: 0, expiresAt: '', firstTimeOnly: false, maxUses: 0 }

export default function AdminCoupons() {
  const { can } = useAdminAccess()
  const canManage = can('coupons.manage')
  const [coupons, setCoupons] = useState([])
  const [form, setForm] = useState(empty)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [loading, setLoading] = useState(true)

  async function load() {
    try {
      const response = await fetch('/api/admin/coupons', { cache: 'no-store' })
      const result = await response.json()
      if (!response.ok || !result.success) throw new Error(result.error || 'Could not load coupons.')
      setCoupons(result.data)
    } catch (e) { setError(e.message) } finally { setLoading(false) }
  }
  useEffect(() => { load() }, [])

  async function createCoupon(event) {
    event.preventDefault(); setError(''); setNotice('')
    try {
      const response = await fetch('/api/admin/coupons', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) })
      const result = await response.json()
      if (!response.ok || !result.success) throw new Error(result.error || 'Could not create coupon.')
      setNotice(`Coupon ${result.data.code} created.`); setForm(empty); await load()
    } catch (e) { setError(e.message) }
  }

  async function toggle(coupon) {
    if (!canManage) return
    setError(''); setNotice('')
    try {
      const response = await fetch('/api/admin/coupons', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: coupon.id, active: !coupon.active }) })
      const result = await response.json()
      if (!response.ok || !result.success) throw new Error(result.error || 'Could not update coupon.')
      setNotice(`${coupon.code} ${result.data.active ? 'activated' : 'deactivated'}.`); await load()
    } catch (e) { setError(e.message) }
  }

  return <section className="space-y-6"><header><h1 className="font-display text-3xl text-plum">Coupons</h1><p className="mt-1 text-sm text-muted">Create and manage discount codes available in the cart.</p></header>
    {error && <p role="alert" className="rounded-xl bg-bloom/10 p-3 text-sm text-bloom">{error}</p>}{notice && <p role="status" className="rounded-xl bg-sage/20 p-3 text-sm">{notice}</p>}
    {canManage && <form onSubmit={createCoupon} className="grid gap-3 rounded-2xl bg-cream p-5 shadow-soft ring-1 ring-sand sm:grid-cols-2 lg:grid-cols-6">
      <label className="text-xs text-muted">Code<input required minLength={3} maxLength={24} value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })} className="mt-1 w-full rounded-lg border border-sand px-3 py-2 text-sm text-plum" /></label>
      <label className="text-xs text-muted">Label<input required value={form.label} onChange={(e) => setForm({ ...form, label: e.target.value })} className="mt-1 w-full rounded-lg border border-sand px-3 py-2 text-sm text-plum" /></label>
      <label className="text-xs text-muted">Discount %<input required type="number" min="1" max="100" value={form.discountPercent} onChange={(e) => setForm({ ...form, discountPercent: e.target.value })} className="mt-1 w-full rounded-lg border border-sand px-3 py-2 text-sm text-plum" /></label>
      <label className="text-xs text-muted">Minimum cart ₹<input type="number" min="0" value={form.minSubtotal} onChange={(e) => setForm({ ...form, minSubtotal: e.target.value })} className="mt-1 w-full rounded-lg border border-sand px-3 py-2 text-sm text-plum" /></label>
      <label className="text-xs text-muted">Expires (optional)<input type="date" value={form.expiresAt} onChange={(e) => setForm({ ...form, expiresAt: e.target.value })} className="mt-1 w-full rounded-lg border border-sand px-3 py-2 text-sm text-plum" /></label>
      <label className="text-xs text-muted">First-time only<input type="checkbox" checked={form.firstTimeOnly} onChange={(e) => setForm({ ...form, firstTimeOnly: e.target.checked })} className="mt-1 h-4 w-4 accent-plum" /></label>
      <label className="text-xs text-muted">Max uses (0 = unlimited)<input type="number" min="0" value={form.maxUses} onChange={(e) => setForm({ ...form, maxUses: e.target.value })} className="mt-1 w-full rounded-lg border border-sand px-3 py-2 text-sm text-plum" /></label>
      <button className="self-end rounded-full bg-plum px-4 py-2.5 text-sm font-semibold text-cream">Create coupon</button>
    </form>}
    {loading ? <p role="status">Loading coupons…</p> : <>
      <div className="space-y-3 md:hidden">{coupons.map((coupon) => <article key={coupon.id} className="rounded-2xl bg-cream p-4 shadow-soft ring-1 ring-sand"><div className="flex items-start justify-between gap-3"><div className="min-w-0"><strong className="break-all text-plum">{coupon.code}</strong><p className="break-words text-xs text-muted">{coupon.label}</p></div><span className="shrink-0 rounded-full bg-blush/50 px-2 py-1 text-xs">{coupon.active ? 'Active' : 'Inactive'}</span></div><div className="mt-3 grid grid-cols-2 gap-2 border-t border-sand pt-3 text-sm"><span className="text-muted">Discount</span><strong className="text-right">{coupon.discountPercent}%</strong><span className="text-muted">Minimum cart</span><strong className="text-right">₹{coupon.minSubtotal}</strong><span className="text-muted">Expiry</span><strong className="text-right">{coupon.expiresAt ? new Date(coupon.expiresAt).toLocaleDateString() : 'Never'}</strong><span className="text-muted">Uses</span><strong className="text-right">{coupon.currentUses || 0}{coupon.maxUses ? '/' + coupon.maxUses : ''}</strong><div className="col-span-2 mt-1 flex flex-wrap gap-1">{coupon.firstTimeOnly ? <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs text-amber-700">First-time only</span> : null}{coupon.maxUses > 0 ? <span className="rounded-full bg-blush/50 px-2 py-0.5 text-xs">Max {coupon.maxUses}</span> : null}</div></div><button disabled={!canManage} onClick={() => toggle(coupon)} className="mt-3 min-h-11 w-full rounded-xl border border-sand px-3 py-2 text-sm">{coupon.active ? 'Deactivate coupon' : 'Activate coupon'}</button></article>)}{coupons.length === 0 && <p className="rounded-2xl bg-cream p-6 text-muted">No coupons created yet.</p>}</div>
      <div className="hidden overflow-x-auto rounded-2xl bg-cream shadow-soft ring-1 ring-sand md:block"><table className="w-full min-w-[650px] text-left text-sm"><thead className="border-b border-sand text-muted"><tr><th className="p-4">Code</th><th className="p-4">Discount</th><th className="p-4">Minimum cart</th><th className="p-4">Uses</th><th className="p-4">Restrictions</th><th className="p-4">Expiry</th><th className="p-4">Status</th><th className="p-4">Action</th></tr></thead><tbody>{coupons.map((coupon) => <tr key={coupon.id} className="border-b border-sand/70"><td className="p-4"><strong>{coupon.code}</strong><div className="text-xs text-muted">{coupon.label}</div></td><td className="p-4">{coupon.discountPercent}%</td><td className="p-4">₹{coupon.minSubtotal}</td><td className="p-4">{coupon.currentUses || 0}{coupon.maxUses ? ` / ${coupon.maxUses}` : ''}</td><td className="p-4"><div className="flex flex-wrap gap-1">{coupon.firstTimeOnly ? <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs text-amber-700">First-time only</span> : null}{coupon.maxUses > 0 ? <span className="rounded-full bg-blush/50 px-2 py-0.5 text-xs">Max {coupon.maxUses} uses</span> : null}{!coupon.firstTimeOnly && !(coupon.maxUses > 0) ? <span className="text-xs text-muted">None</span> : null}</div></td><td className="p-4">{coupon.expiresAt ? new Date(coupon.expiresAt).toLocaleDateString() : 'Never'}</td><td className="p-4">{coupon.active ? 'Active' : 'Inactive'}</td><td className="p-4"><button disabled={!canManage} onClick={() => toggle(coupon)} className="rounded-lg border border-sand px-3 py-2">{coupon.active ? 'Deactivate' : 'Activate'}</button></td></tr>)}</tbody></table>{coupons.length === 0 && <p className="p-6 text-muted">No coupons created yet.</p>}</div>
    </>}
  </section>
}

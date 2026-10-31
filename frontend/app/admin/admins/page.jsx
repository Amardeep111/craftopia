'use client'

import { useEffect, useState } from 'react'
import { useAdminAccess } from '../access-context'
import { ADMIN_PERMISSION_GROUPS } from '@/lib/auth/permissions'
import { encryptPassword } from '@/lib/auth/password-encryption-client'
import Select from '@/components/ui/Select'

const emptyForm = { name: '', email: '', password: '', permissions: [] }

export default function AdminAccessPage() {
  const { isSuperadmin } = useAdminAccess()
  const [admins, setAdmins] = useState([])
  const [selectedId, setSelectedId] = useState('')
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState('ALL')
  const [statusFilter, setStatusFilter] = useState('ALL')
  const [drafts, setDrafts] = useState({})
  const [passwords, setPasswords] = useState({})
  const [form, setForm] = useState(emptyForm)
  const [removeId, setRemoveId] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  async function resetPassword(admin) {
    setSaving(true); setError(''); setNotice('')
    try {
      const encryptedPassword = await encryptPassword(passwords[admin.id] || '')
      const response = await fetch('/api/admin/admins/password', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ userId: admin.id, encryptedPassword }) })
      const result = await response.json()
      if (!response.ok || !result.success) throw new Error(result.error || 'Could not reset admin password.')
      setPasswords((current) => ({ ...current, [admin.id]: '' }))
      setNotice(result.message)
    } catch (cause) { setError(cause.message) } finally { setSaving(false) }
  }

  async function load() {
    setLoading(true)
    try {
      const response = await fetch('/api/admin/admins', { cache: 'no-store' })
      const result = await response.json()
      if (!response.ok || !result.success) throw new Error(result.error || 'Could not load admin accounts.')
      setAdmins(result.data)
      setSelectedId((current) => result.data.some((admin) => admin.id === current) ? current : '')
      setDrafts(Object.fromEntries(result.data.map((admin) => [admin.id, { name: admin.name || '', active: admin.adminActive !== false, permissions: Array.isArray(admin.adminPermissions) ? admin.adminPermissions : [] }])))
      setError('')
    } catch (cause) { setError(cause.message) } finally { setLoading(false) }
  }
  useEffect(() => { if (isSuperadmin) load(); else setLoading(false) }, [isSuperadmin])

  function togglePermission(target, permission) {
    const current = target === 'new' ? form : drafts[target]
    const permissions = current.permissions.includes(permission)
      ? current.permissions.filter((value) => value !== permission)
      : [...current.permissions, permission]
    if (target === 'new') setForm({ ...form, permissions })
    else setDrafts({ ...drafts, [target]: { ...current, permissions } })
  }

  const filteredAdmins = admins.filter((admin) => {
    const term = search.trim().toLowerCase()
    const matchesText = !term || `${admin.name || ''} ${admin.email}`.toLowerCase().includes(term)
    const matchesRole = roleFilter === 'ALL' || admin.role === roleFilter
    const matchesStatus = statusFilter === 'ALL' || (statusFilter === 'ACTIVE' ? admin.adminActive !== false : admin.adminActive === false)
    return matchesText && matchesRole && matchesStatus
  })
  async function createAdmin(event) {
    event.preventDefault(); setSaving(true); setError(''); setNotice('')
    try {
      const encryptedPassword = form.password ? await encryptPassword(form.password) : undefined
      const response = await fetch('/api/admin/admins', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...form, password: undefined, encryptedPassword }) })
      const result = await response.json()
      if (!response.ok || !result.success) throw new Error(result.error || 'Could not add admin.')
      setNotice(`Admin access granted to ${result.data.email}.`)
      setForm(emptyForm)
      setShowCreateForm(false)
      await load()
    } catch (cause) { setError(cause.message) } finally { setSaving(false) }
  }

  async function saveAdmin(admin) {
    const draft = drafts[admin.id]
    setSaving(true); setError(''); setNotice('')
    try {
      const response = await fetch('/api/admin/admins', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ userId: admin.id, ...draft }) })
      const result = await response.json()
      if (!response.ok || !result.success) throw new Error(result.error || 'Could not update admin.')
      setNotice(`Permissions updated for ${admin.email}. Their active sessions were signed out.`)
      await load()
    } catch (cause) { setError(cause.message) } finally { setSaving(false) }
  }

  async function removeAdmin(admin) {
    setSaving(true); setError(''); setNotice('')
    try {
      const response = await fetch('/api/admin/admins', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ userId: admin.id }) })
      const result = await response.json()
      if (!response.ok || !result.success) throw new Error(result.error || 'Could not remove admin access.')
      setNotice(`Admin access removed for ${admin.email}.`)
      setRemoveId('')
      await load()
    } catch (cause) { setError(cause.message) } finally { setSaving(false) }
  }

  if (!isSuperadmin) return <section className="rounded-2xl bg-cream p-6 shadow-soft ring-1 ring-sand"><h1 className="font-display text-2xl text-plum">Admin access</h1><p className="mt-2 text-sm text-muted">Only a superadmin can manage administrator accounts and permissions.</p></section>

  return <section className="min-w-0 space-y-6">
    <header><p className="text-xs font-bold uppercase tracking-[0.18em] text-bloom">Superadmin</p><h1 className="font-display text-2xl text-plum sm:text-3xl">Admin access</h1><p className="mt-1 text-sm text-muted">Add administrators, choose which sections they can access, and revoke access when needed.</p></header>
    {error && <p role="alert" className="rounded-xl bg-bloom/10 p-3 text-sm text-bloom">{error}</p>}{notice && <p role="status" className="rounded-xl bg-sage/20 p-3 text-sm">{notice}</p>}

    <button type="button" onClick={() => setShowCreateForm((open) => !open)} className="min-h-11 rounded-xl bg-plum px-4 py-2 font-semibold text-cream">{showCreateForm ? 'Close new administrator form' : 'Add administrator'}</button>
    {showCreateForm && <form onSubmit={createAdmin} className="space-y-4 rounded-2xl bg-cream p-4 shadow-soft ring-1 ring-sand sm:p-6">
      <div><h2 className="font-display text-xl text-plum">Add an administrator</h2><p className="mt-1 text-xs text-muted">An existing customer account can be promoted by email. Enter a password only when creating a new account.</p></div>
      <div className="grid gap-3 sm:grid-cols-2"><label className="text-sm text-muted">Name<input required value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} className="mt-1 min-h-11 w-full rounded-xl border border-sand bg-white px-3 text-plum" /></label><label className="text-sm text-muted">Email<input required type="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} className="mt-1 min-h-11 w-full rounded-xl border border-sand bg-white px-3 text-plum" /></label><label className="text-sm text-muted sm:col-span-2">Initial password, for a new account<input type="password" autoComplete="new-password" value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} className="mt-1 min-h-11 w-full rounded-xl border border-sand bg-white px-3 text-plum" /><span className="mt-1 block text-xs">At least 8 characters, including uppercase, lowercase, and a number. Existing customers keep their current password.</span></label></div>
      <PermissionPicker value={form.permissions} onToggle={(permission) => togglePermission('new', permission)} />
      <button disabled={saving} className="min-h-11 w-full rounded-xl bg-plum px-4 py-2 font-semibold text-cream disabled:opacity-60 sm:w-auto">{saving ? 'Saving…' : 'Grant admin access'}</button>
    </form>}

    <div className="space-y-4"><div><h2 className="font-display text-xl text-plum">Administrator accounts</h2><p className="mt-1 text-sm text-muted">Select an account to view and manage its settings.</p></div>
      <div className="grid gap-3 rounded-2xl bg-cream p-4 shadow-soft ring-1 ring-sand sm:grid-cols-3">
        <label className="text-sm font-medium text-plum sm:col-span-1">Search by name or email<input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Name or email" className="mt-1 min-h-11 w-full rounded-xl border border-sand bg-white px-3 font-normal" /></label>
        <div><span className="mb-1 block text-sm font-medium text-plum">Role</span><Select value={roleFilter} onChange={setRoleFilter} options={[{ value: 'ALL', label: 'All roles' }, { value: 'ADMIN', label: 'Admin' }, { value: 'SUPERADMIN', label: 'Superadmin' }]} /></div>
        <div><span className="mb-1 block text-sm font-medium text-plum">Account status</span><Select value={statusFilter} onChange={setStatusFilter} options={[{ value: 'ALL', label: 'All statuses' }, { value: 'ACTIVE', label: 'Active' }, { value: 'INACTIVE', label: 'Inactive' }]} /></div>
      </div>
      {loading ? <p role="status">Loading administrator accounts…</p> : filteredAdmins.length ? <div className="space-y-2">{filteredAdmins.map((admin) => <div key={admin.id} className="space-y-2"><button type="button" aria-expanded={selectedId === admin.id} onClick={() => setSelectedId((current) => current === admin.id ? '' : admin.id)} className={`block w-full rounded-2xl p-4 text-left shadow-soft ring-1 transition ${selectedId === admin.id ? 'bg-blush/40 ring-plum/40' : 'bg-cream ring-sand hover:bg-white'}`}><span className="block break-words font-semibold text-plum">{admin.name || 'Administrator'}</span><span className="mt-1 block break-all text-sm text-muted">{admin.email}</span></button>{selectedId === admin.id && <AdminDetails admin={admin} draft={drafts[admin.id]} password={passwords[admin.id] || ''} saving={saving} removeId={removeId} setDraft={(patch) => setDrafts((current) => ({ ...current, [admin.id]: { ...current[admin.id], ...patch } }))} setPassword={(value) => setPasswords((current) => ({ ...current, [admin.id]: value }))} togglePermission={(permission) => togglePermission(admin.id, permission)} resetPassword={resetPassword} saveAdmin={saveAdmin} removeAdmin={removeAdmin} setRemoveId={setRemoveId} />}</div>)}</div> : <p className="rounded-2xl bg-cream p-5 text-sm text-muted">No administrators match these filters.</p>}
    </div>
  </section>
}

function AdminDetails({ admin, draft, password, saving, removeId, setDraft, setPassword, togglePermission, resetPassword, saveAdmin, removeAdmin, setRemoveId }) {
  if (admin.role === 'SUPERADMIN') return <article className="rounded-2xl bg-cream p-4 shadow-soft ring-1 ring-sand sm:p-6"><h3 className="font-display text-xl text-plum">Administrator settings</h3><p className="mt-1 break-all text-sm text-muted">{admin.name || 'Administrator'} · {admin.email}</p><p className="mt-4 rounded-xl bg-blush/30 p-3 text-sm text-muted">Superadmins have full access and cannot be edited or removed here.</p></article>
  return <article className="min-w-0 space-y-4 rounded-2xl bg-cream p-4 shadow-soft ring-1 ring-sand sm:p-6">
    <div><h3 className="font-display text-xl text-plum">Administrator settings</h3><p className="mt-1 break-all text-sm text-muted">{admin.name || 'Administrator'} · {admin.email}</p></div>
    <label className="flex min-h-11 items-center gap-2 text-sm text-plum"><input type="checkbox" checked={draft?.active ?? true} onChange={(event) => setDraft({ active: event.target.checked })} />Account active</label>
    <label className="block max-w-xl text-sm text-muted">Display name<input value={draft?.name || ''} onChange={(event) => setDraft({ name: event.target.value })} className="mt-1 min-h-11 w-full rounded-xl border border-sand bg-white px-3 text-plum" /></label>
    <PermissionPicker value={draft?.permissions || []} onToggle={togglePermission} />
    <div className="flex flex-col gap-2 rounded-xl border border-sand bg-white p-3 sm:flex-row sm:items-end"><label className="min-w-0 flex-1 text-sm text-muted">Set a new password<input type="password" autoComplete="new-password" minLength={8} value={password} onChange={(event) => setPassword(event.target.value)} className="mt-1 min-h-11 w-full rounded-xl border border-sand bg-cream px-3 text-plum" /></label><button type="button" disabled={saving || !password} onClick={() => resetPassword(admin)} className="min-h-11 rounded-xl border border-sand px-4 py-2 font-semibold text-plum disabled:opacity-50">Reset password</button></div>
    <div className="flex flex-col gap-2 sm:flex-row"><button type="button" disabled={saving} onClick={() => saveAdmin(admin)} className="min-h-11 rounded-xl bg-plum px-4 py-2 font-semibold text-cream disabled:opacity-60">Save administrator</button>{removeId === admin.id ? <div className="flex flex-col gap-2 rounded-xl border border-bloom/30 p-2 text-sm sm:flex-row sm:items-center"><span>Remove admin access?</span><button type="button" disabled={saving} onClick={() => removeAdmin(admin)} className="min-h-10 rounded-lg bg-bloom px-3 text-white">Confirm removal</button><button type="button" onClick={() => setRemoveId('')} className="min-h-10 rounded-lg px-3 text-plum">Keep admin</button></div> : <button type="button" onClick={() => setRemoveId(admin.id)} className="min-h-11 rounded-xl border border-sand px-4 py-2 text-plum">Remove admin access</button>}</div>
    <p className="text-xs text-muted">Saving permission changes signs the administrator out so the new access takes effect immediately.</p>
  </article>
}

function PermissionPicker({ value, onToggle }) {
  return <fieldset className="mt-3 min-w-0"><legend className="text-sm font-semibold text-plum">Permissions</legend><div className="mt-2 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{ADMIN_PERMISSION_GROUPS.map((group) => <div key={group.key} className="rounded-xl border border-sand bg-white p-3"><p className="mb-2 text-sm font-semibold text-plum">{group.label}</p>{group.permissions.map(({ id, label }) => <label key={id} className="flex min-h-10 items-start gap-2 py-1 text-sm text-muted"><input type="checkbox" checked={value.includes(id)} onChange={() => onToggle(id)} className="mt-1" /><span>{label}</span></label>)}</div>)}</div></fieldset>
}

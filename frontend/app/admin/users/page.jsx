'use client'

import { useEffect, useState } from 'react'
import { useAdminAccess } from '../access-context'

export default function AdminUsers() {
  const { can } = useAdminAccess()
  const [users, setUsers] = useState([])
  const [error, setError] = useState('')
  const [savingId, setSavingId] = useState('')
  const [loading, setLoading] = useState(true)
  async function loadUsers() {
    fetch('/api/admin/users', { cache: 'no-store' }).then(async (response) => {
      const result = await response.json()
      if (!response.ok || !result.success) throw new Error(result.error || 'Could not load users.')
      setUsers(result.data)
    }).catch((e) => setError(e.message)).finally(() => setLoading(false))
  }
  useEffect(() => { loadUsers() }, [])

  async function setActive(user, active) {
    setError(''); setSavingId(user.id)
    try {
      const response = await fetch('/api/admin/users', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: user.id, active }) })
      const result = await response.json()
      if (!response.ok || !result.success) throw new Error(result.error || 'Could not update this account.')
      setUsers((current) => current.map((item) => item.id === user.id ? { ...item, active } : item))
    } catch (cause) { setError(cause.message) } finally { setSavingId('') }
  }

  return <section className="space-y-6"><header><h1 className="font-display text-3xl text-plum">Users</h1><p className="mt-1 text-sm text-muted">Customer accounts and order activity.</p></header>
    {error && <p role="alert" className="rounded-xl bg-bloom/10 p-3 text-sm text-bloom">{error}</p>}
    {loading ? <p role="status">Loading users…</p> : <>
      <div className="space-y-3 md:hidden">{users.map((user) => <article key={user.id} className="break-words rounded-2xl bg-cream p-4 shadow-soft ring-1 ring-sand"><div className="flex items-start justify-between gap-2"><strong className="text-plum">{user.name || '—'}</strong><span className={`rounded-full px-2 py-1 text-xs ${user.active === false ? 'bg-bloom/10 text-bloom' : 'bg-sage/20 text-ink'}`}>{user.active === false ? 'Inactive' : 'Active'}</span></div><p className="mt-1 break-all text-sm">{user.email}</p><p className="mt-1 text-sm text-muted">{user.phone || 'No phone provided'}</p><div className="mt-3 flex justify-between border-t border-sand pt-3 text-xs text-muted"><span>{user._count.orders} orders</span><span>Joined {new Date(user.createdAt).toLocaleDateString()}</span></div>{can('users.manage') && <button disabled={savingId === user.id} onClick={() => setActive(user, user.active === false)} className="mt-3 min-h-10 rounded-lg border border-sand px-3 text-sm font-semibold text-plum disabled:opacity-60">{savingId === user.id ? 'Saving…' : user.active === false ? 'Activate account' : 'Deactivate account'}</button>}</article>)}{users.length === 0 && <p className="rounded-2xl bg-cream p-6 text-muted">No users yet.</p>}</div>
      <div className="hidden overflow-x-auto rounded-2xl bg-cream shadow-soft ring-1 ring-sand md:block"><table className="w-full min-w-[700px] text-left text-sm"><thead className="border-b border-sand text-muted"><tr><th className="p-4">Name</th><th className="p-4">Email</th><th className="p-4">Phone</th><th className="p-4">Orders</th><th className="p-4">Status</th><th className="p-4">Joined</th>{can('users.manage') && <th className="p-4">Action</th>}</tr></thead><tbody>{users.map((user) => <tr key={user.id} className="border-b border-sand/70"><td className="p-4 font-medium">{user.name || '—'}</td><td className="p-4">{user.email}</td><td className="p-4">{user.phone || '—'}</td><td className="p-4">{user._count.orders}</td><td className="p-4">{user.active === false ? 'Inactive' : 'Active'}</td><td className="p-4">{new Date(user.createdAt).toLocaleDateString()}</td>{can('users.manage') && <td className="p-4"><button disabled={savingId === user.id} onClick={() => setActive(user, user.active === false)} className="font-semibold text-plum underline underline-offset-4 disabled:opacity-60">{user.active === false ? 'Activate' : 'Deactivate'}</button></td>}</tr>)}</tbody></table>{users.length === 0 && <p className="p-6 text-muted">No users yet.</p>}</div>
    </>}
  </section>
}

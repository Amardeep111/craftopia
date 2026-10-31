'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { LogOut, MapPin, Plus, Trash2, UserRound } from 'lucide-react'
import { useUserStore } from '@/lib/user'
import AddressForm from '@/components/checkout/AddressForm'
import ChangePasswordForm from '@/components/account/ChangePasswordForm'

const blankAddress = { fullName: '', mobileNumber: '', houseFlatBuilding: '', areaStreet: '', landmark: '', city: '', state: '', pinCode: '', addressType: 'home', isDefault: false }

export default function ProfilePage() {
  const router = useRouter()
  const updateUser = useUserStore((state) => state.login)
  const clearUser = useUserStore((state) => state.logout)
  const [profile, setProfile] = useState({ userId: '', name: '', email: '', phone: '' })
  const [addresses, setAddresses] = useState([])
  const [addressForm, setAddressForm] = useState(blankAddress)
  const [editingId, setEditingId] = useState('')
  const [loading, setLoading] = useState(true)
  const [savingProfile, setSavingProfile] = useState(false)
  const [savingAddress, setSavingAddress] = useState(false)
  const [signingOut, setSigningOut] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [showAddressForm, setShowAddressForm] = useState(false)

  async function loadProfile() {
    const response = await fetch('/api/auth/me', { cache: 'no-store' })
    const result = await response.json().catch(() => ({}))
    if (!response.ok || !result.success) {
      router.replace('/account/login?redirect=/account/profile')
      return
    }
    const user = result.data
    setProfile({ userId: user.userId, name: user.name || '', email: user.email || '', phone: user.phone || '' })
    updateUser({ userId: user.userId, email: user.email, name: user.name })
    const addressResponse = await fetch('/api/addresses', { cache: 'no-store' })
    const addressResult = await addressResponse.json().catch(() => ({}))
    if (!addressResponse.ok || !addressResult.success) throw new Error(addressResult.error || 'Could not load saved addresses.')
    setAddresses(addressResult.data)
  }

  useEffect(() => {
    loadProfile().catch((cause) => setError(cause.message || 'Could not load your profile.')).finally(() => setLoading(false))
  }, [])

  async function saveProfile(event) {
    event.preventDefault(); setError(''); setNotice(''); setSavingProfile(true)
    try {
      const response = await fetch('/api/account/profile', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: profile.name, phone: profile.phone }) })
      const result = await response.json().catch(() => ({}))
      if (!response.ok || !result.success) throw new Error(result.error || 'Could not save your profile.')
      setProfile((current) => ({ ...current, ...result.data }))
      updateUser({ userId: result.data.id, email: result.data.email, name: result.data.name })
      setNotice('Profile updated.')
    } catch (cause) { setError(cause.message || 'Could not save your profile.') } finally { setSavingProfile(false) }
  }

  function startAddAddress() { setEditingId(''); setAddressForm(blankAddress); setShowAddressForm(true); setError('') }
  function startEditAddress(address) { setEditingId(address.id); setAddressForm({ ...blankAddress, ...address }); setShowAddressForm(true); setError('') }

  async function saveAddress(addressData) {
    setError(''); setNotice(''); setSavingAddress(true)
    try {
      const response = await fetch('/api/addresses', { method: editingId ? 'PATCH' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(editingId ? { ...addressData, id: editingId } : addressData) })
      const result = await response.json().catch(() => ({}))
      if (!response.ok || !result.success) throw new Error(result.error || 'Could not save this address.')
      await loadProfile(); setShowAddressForm(false); setEditingId(''); setNotice(editingId ? 'Address updated.' : 'Address saved.')
    } catch (cause) { setError(cause.message || 'Could not save this address.'); throw cause } finally { setSavingAddress(false) }
  }

  async function deleteAddress(id) {
    setError(''); setNotice('')
    try {
      const response = await fetch(`/api/addresses?id=${encodeURIComponent(id)}`, { method: 'DELETE' })
      const result = await response.json().catch(() => ({}))
      if (!response.ok || !result.success) throw new Error(result.error || 'Could not delete this address.')
      setAddresses((items) => items.filter((address) => address.id !== id)); setNotice('Address deleted.')
    } catch (cause) { setError(cause.message || 'Could not delete this address.') }
  }

  async function setDefault(address) {
    setError(''); setNotice('')
    try {
      const response = await fetch('/api/addresses', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...address, isDefault: true }) })
      const result = await response.json().catch(() => ({}))
      if (!response.ok || !result.success) throw new Error(result.error || 'Could not update the default address.')
      setAddresses((items) => items.map((item) => ({ ...item, isDefault: item.id === address.id }))); setNotice('Default address updated.')
    } catch (cause) { setError(cause.message || 'Could not update the default address.') }
  }

  async function signOut() {
    if (signingOut) return
    setError(''); setSigningOut(true)
    try {
      const response = await fetch('/api/auth/logout', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' })
      const result = await response.json().catch(() => ({}))
      if (!response.ok || !result.success) throw new Error(result.error || 'Could not sign out. Please try again.')
      clearUser()
      router.replace('/')
      router.refresh()
    } catch (cause) {
      setError(cause.message || 'Could not sign out. Please try again.')
    } finally {
      setSigningOut(false)
    }
  }

  if (loading) return <main className="container-page py-24 text-center text-muted">Loading your profile…</main>

  return <main className="container-page max-w-5xl space-y-8 pb-24 pt-8 md:pt-12">
    <header className="flex flex-wrap items-end justify-between gap-4"><div><p className="text-xs font-bold uppercase tracking-[0.2em] text-bloom">Your account</p><h1 className="mt-1 font-display text-3xl text-plum">Profile & addresses</h1><p className="mt-2 text-sm text-muted">Manage the details and delivery addresses saved to your account.</p></div><button type="button" onClick={signOut} disabled={signingOut} className="inline-flex min-h-11 items-center gap-2 rounded-full border border-sand px-4 py-2 text-sm font-semibold text-plum hover:bg-ivory disabled:opacity-60"><LogOut className="h-4 w-4" aria-hidden="true" />{signingOut ? 'Signing out…' : 'Sign out'}</button></header>
    {error && <p role="alert" className="rounded-xl bg-bloom/10 p-3 text-sm text-bloom">{error}</p>}{notice && <p role="status" className="rounded-xl bg-sage/20 p-3 text-sm text-ink">{notice}</p>}
    <section className="rounded-3xl border border-sand bg-cream p-5 shadow-soft sm:p-7"><div className="mb-5 flex items-center gap-3"><span className="rounded-xl bg-blush p-2 text-bloom"><UserRound className="h-5 w-5" /></span><div><h2 className="font-display text-xl text-plum">Personal details</h2><p className="text-sm text-muted">Your email address cannot be changed here.</p></div></div>
      <form onSubmit={saveProfile} className="grid gap-4 sm:grid-cols-2"><label className="block text-sm font-medium text-plum">Full name<input required minLength={2} maxLength={100} value={profile.name} onChange={(event) => setProfile((current) => ({ ...current, name: event.target.value }))} className="mt-1.5 w-full rounded-xl border border-sand bg-white px-3 py-2.5 outline-none focus:border-bloom" /></label><label className="block text-sm font-medium text-plum">Email<input disabled value={profile.email} className="mt-1.5 w-full rounded-xl border border-sand bg-ink/5 px-3 py-2.5 text-muted" /></label><label className="block text-sm font-medium text-plum">Mobile number<input type="tel" value={profile.phone} onChange={(event) => setProfile((current) => ({ ...current, phone: event.target.value }))} className="mt-1.5 w-full rounded-xl border border-sand bg-white px-3 py-2.5 outline-none focus:border-bloom" /></label><div className="sm:col-span-2"><button disabled={savingProfile} className="rounded-full bg-plum px-5 py-2.5 font-semibold text-cream disabled:opacity-60">{savingProfile ? 'Saving…' : 'Save profile'}</button></div></form>
    </section>
    <ChangePasswordForm />
    <section className="rounded-3xl border border-sand bg-cream p-5 shadow-soft sm:p-7"><div className="mb-5 flex flex-wrap items-center justify-between gap-3"><div className="flex items-center gap-3"><span className="rounded-xl bg-blush p-2 text-bloom"><MapPin className="h-5 w-5" /></span><div><h2 className="font-display text-xl text-plum">Saved addresses</h2><p className="text-sm text-muted">Use these addresses at checkout.</p></div></div><button onClick={startAddAddress} className="inline-flex items-center gap-2 rounded-full bg-plum px-4 py-2.5 text-sm font-semibold text-cream"><Plus className="h-4 w-4" />Add address</button></div>
      {addresses.length === 0 ? <p className="rounded-2xl bg-ivory p-5 text-sm text-muted">No saved addresses yet. Add one for faster checkout.</p> : <div className="grid gap-3 md:grid-cols-2">{addresses.map((address) => <article key={address.id} className="rounded-2xl border border-sand bg-white p-4"><div className="flex items-start justify-between gap-3"><div><p className="font-semibold text-plum">{address.fullName} {address.isDefault && <span className="ml-1 rounded-full bg-sage/20 px-2 py-0.5 text-xs text-ink">Default</span>}</p><p className="mt-1 text-sm text-muted">{address.mobileNumber}</p><p className="mt-2 text-sm text-ink">{address.houseFlatBuilding}, {address.areaStreet}{address.landmark ? `, ${address.landmark}` : ''}, {address.city}, {address.state} {address.pinCode}</p><p className="mt-1 text-xs capitalize text-muted">{address.addressType}</p></div><button aria-label={`Delete address for ${address.fullName}`} onClick={() => deleteAddress(address.id)} className="rounded-lg p-2 text-muted hover:bg-bloom/10 hover:text-bloom"><Trash2 className="h-4 w-4" /></button></div><div className="mt-4 flex gap-3 border-t border-sand pt-3 text-sm"><button onClick={() => startEditAddress(address)} className="font-semibold text-plum underline underline-offset-4">Edit</button>{!address.isDefault && <button onClick={() => setDefault(address)} className="font-semibold text-plum underline underline-offset-4">Set as default</button>}</div></article>)}</div>}
    </section>
    <AddressForm
      open={showAddressForm}
      initial={editingId ? addressForm : null}
      onClose={() => { if (!savingAddress) setShowAddressForm(false) }}
      onSave={saveAddress}
      saving={savingAddress}
    />
    <Link href="/orders/me" className="inline-block text-sm font-semibold text-plum underline underline-offset-4">View my orders</Link>
  </main>
}

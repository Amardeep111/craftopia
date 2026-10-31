'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { ArrowLeft, Plus, MapPin, Info, Sparkles } from 'lucide-react'
import Button from '@/components/ui/Button'
import CheckoutProgress from '@/components/checkout/CheckoutProgress'
import AddressCard from '@/components/checkout/AddressCard'
import AddressForm from '@/components/checkout/AddressForm'
import OrderSummary from '@/components/checkout/OrderSummary'
import { useAddressStore, validateAddress } from '@/lib/address'
import { useCartStore } from '@/lib/cart'
import { useUserStore } from '@/lib/user'

export default function CheckoutAddressPage() {
  const {
    addresses,
    selectedAddressId,
    hydrated,
    addAddress,
    updateAddress,
    removeAddress,
    setDefault,
    selectAddress,
    setAddresses,
    getSelectedAddress,
    getDefaultAddress,
  } = useAddressStore()

  const userId = useUserStore((s) => s.userId)
  const login = useUserStore((s) => s.login)
  const logout = useUserStore((s) => s.logout)
  const cartItems = useCartStore((s) => s.items)
  const totalPrice = cartItems.reduce((sum, i) => sum + i.price * i.quantity, 0)
  const [showForm, setShowForm] = useState(false)
  const [editingAddress, setEditingAddress] = useState(null)
  const [savingAddress, setSavingAddress] = useState(false)
  const [justAdded, setJustAdded] = useState(false)
  const [sessionReady, setSessionReady] = useState(false)
  const [addressError, setAddressError] = useState('')

  useEffect(() => {
    let active = true
    async function loadAccountData() {
      try {
        const meResponse = await fetch('/api/auth/me', { cache: 'no-store' })
        const me = await meResponse.json().catch(() => ({}))
        if (!meResponse.ok || !me.success) {
          logout()
          setAddresses([])
          return
        }
        login(me.data)
        const addressResponse = await fetch('/api/addresses', { cache: 'no-store' })
        const result = await addressResponse.json().catch(() => ({}))
        if (!addressResponse.ok || !result.success) throw new Error(result.error || 'Could not load your saved addresses.')
        if (active) setAddresses(result.data)
      } catch (error) {
        if (active) {
          setAddresses([])
          setAddressError(error.message || 'Could not load saved addresses.')
        }
      } finally {
        if (active) setSessionReady(true)
      }
    }
    loadAccountData()
    return () => { active = false }
  }, [login, logout, setAddresses])

  // Auto-select first/default when account data is ready.
  useEffect(() => {
    if (sessionReady && hydrated && addresses.length > 0 && !selectedAddressId) {
      const def = getDefaultAddress()
      if (def) selectAddress(def.id)
    }
  }, [sessionReady, hydrated, addresses, selectedAddressId, getDefaultAddress, selectAddress])

  // Prefetch UPI payment details in background so QR code is instant at payment step
  useEffect(() => {
    fetch('/api/payment/upi-details').catch(() => {})
  }, [])

  const selectedAddr = getSelectedAddress()

  async function handleSave(d) {
    const errs = validateAddress(d)
    if (Object.keys(errs).length > 0) return
    setAddressError('')
    setSavingAddress(true)
    try {
      const response = await fetch('/api/addresses', {
        method: editingAddress ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editingAddress ? { ...d, id: editingAddress.id } : d),
      })
      const result = await response.json().catch(() => ({}))
      if (!response.ok || !result.success) throw new Error(result.error || 'Could not save the address.')
      if (editingAddress) {
        updateAddress(editingAddress.id, { ...result.data, ...d, id: editingAddress.id })
      } else {
        addAddress(result.data)
        selectAddress(result.data.id)
        setJustAdded(true)
        setTimeout(() => setJustAdded(false), 3000)
      }
      setEditingAddress(null)
      setShowForm(false)
    } catch (error) {
      setAddressError(error.message || 'Could not save the address. Please try again.')
      throw error
    } finally {
      setSavingAddress(false)
    }
  }

  async function handleDelete(id) {
    setAddressError('')
    try {
      const response = await fetch(`/api/addresses?id=${encodeURIComponent(id)}`, { method: 'DELETE' })
      const result = await response.json().catch(() => ({}))
      if (!response.ok || !result.success) throw new Error(result.error || 'Could not remove the address.')
      removeAddress(id)
    } catch (error) {
      setAddressError(error.message || 'Could not remove the address.')
    }
  }

  async function handleMakeDefault(id) {
    const address = addresses.find((item) => item.id === id)
    if (!address) return
    const response = await fetch('/api/addresses', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...address, isDefault: true }),
    })
    const result = await response.json().catch(() => ({}))
    if (!response.ok || !result.success) {
      setAddressError(result.error || 'Could not update the default address.')
      return
    }
    setDefault(id)
  }

  // Verify the server session before showing account data or allowing checkout.
  if (!sessionReady) {
    return <main className="container-page py-24 text-center text-muted">Checking your account…</main>
  }
  if (!userId) {
    return (
      <main className="container-page pb-24 pt-8 md:pt-12 text-center">
        <div className="mx-auto max-w-md rounded-3xl bg-ivory/60 p-10">
          <h2 className="font-display text-2xl text-plum">Sign in to checkout</h2>
          <p className="mt-2 text-sm text-muted">Please log in or create an account to place your order.</p>
          <Link href="/account/login?redirect=/checkout/address" className="mt-5 inline-block rounded-full bg-plum px-5 py-2.5 text-sm font-semibold text-cream">Sign in</Link>
        </div>
      </main>
    )
  }

  const handleEdit = (a) => {
    setEditingAddress(a)
    setShowForm(true)
  }

  const handleSelect = (id) => {
    selectAddress(id)
  }

  const empty = addresses.length === 0

  return (
    <main className="container-page pb-24 pt-8 md:pt-12">
      {/* Progress */}
      <CheckoutProgress current="address" />

      <div className="mt-6 mb-2 flex items-center gap-3">
        <Link href="/cart" className="inline-flex items-center gap-1 text-sm font-semibold text-muted transition hover:text-plum">
          <ArrowLeft className="h-4 w-4" /> Back to bag
        </Link>
        <span aria-hidden="true">/</span>
        <h1 className="font-display text-3xl text-plum">Select Address</h1>
      </div>
      <p className="text-sm text-muted">Where should we deliver your handmade pieces?</p>
      {addressError ? <p role="alert" className="mt-4 rounded-xl bg-bloom/10 p-3 text-sm text-bloom">{addressError}</p> : null}

      <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_22rem] lg:items-start">
        {/* LEFT: Address management */}
        <section aria-label="Address selection" className="space-y-6">
          {/* Auth / continuity notice */}
          <div className="flex items-start gap-3 rounded-2xl bg-ivory/60 p-4 ring-1 ring-sand">
            <Info className="h-5 w-5 text-bloom shrink-0 mt-0.5" aria-hidden="true" />
            <div>
              <h2 className="font-display text-base text-plum">Save across sessions</h2>
              <p className="text-sm text-muted mt-0.5 leading-relaxed">
                Saved addresses are linked to your account and will be available when you sign in on another device.
              </p>
            </div>
          </div>

          {/* Empty state */}
          {empty && (
            <div className="rounded-3xl bg-ivory/60 border border-dashed border-sand p-10 text-center">
              <div className="mx-auto h-14 w-14 rounded-full bg-blush/40 flex items-center justify-center">
                <MapPin className="h-7 w-7 text-bloom" aria-hidden="true" />
              </div>
              <h3 className="mt-4 font-display text-xl text-plum">No saved addresses yet</h3>
              <p className="mt-2 text-sm text-muted">Add your first address to continue to order summary.</p>
              <Button
                onClick={() => { setEditingAddress(null); setShowForm(true) }}
                className="mt-5 inline-flex"
                variant="primary"
              >
                <Plus className="h-4 w-4" aria-hidden="true" /> Add address
              </Button>
            </div>
          )}

          {/* Address cards */}
          {!empty && (
            <>
              <div className="flex items-center justify-between gap-3">
                <h2 className="font-display text-xl text-plum">Your saved addresses</h2>
                <Button
                  onClick={() => { setEditingAddress(null); setShowForm(true) }}
                  variant="secondary"
                  size="sm"
                  className="inline-flex shrink-0"
                >
                  <Plus className="h-4 w-4" aria-hidden="true" /> New address
                </Button>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                {addresses.map((a) => (
                  <AddressCard
                    key={a.id}
                    address={a}
                    selected={selectedAddressId === a.id}
                    onSelect={handleSelect}
                    onEdit={handleEdit}
                    onDelete={handleDelete}
                    onMakeDefault={handleMakeDefault}
                  />
                ))}
              </div>
            </>
          )}

          {/* Selected address banner (visible once selected) */}
          {selectedAddr && (
            <div className="rounded-2xl bg-bloom/5 border border-bloom/20 p-4 flex items-start gap-3">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-bloom text-cream">
                <Sparkles className="h-4 w-4" aria-hidden="true" />
              </div>
              <div>
                <p className="font-display text-base text-plum">Deliver to <span className="font-semibold">{selectedAddr.fullName}</span></p>
                <p className="text-sm text-muted">
                  {selectedAddr.houseFlatBuilding}, {selectedAddr.areaStreet}, {selectedAddr.city}, {selectedAddr.state} — {selectedAddr.pinCode}
                </p>
                <div className="mt-3 flex gap-2">
                  <Button
                    as={Link}
                    href="/checkout"
                    className="inline-flex"
                    variant="primary"
                  >
                    Continue to order summary
                  </Button>
                  <button
                    type="button"
                    onClick={() => setShowForm(true)}
                    className="rounded-full px-4 py-2.5 text-sm font-semibold text-plum ring-1 ring-sand hover:ring-bloom/40 transition bg-cream"
                  >
                    Add another address
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Just-added feedback */}
          {justAdded && (
            <div className="rounded-2xl bg-sage/15 border border-sage/30 p-4 text-sm text-plum font-medium" role="status" aria-live="polite">
              Address saved. Select it above to continue.
            </div>
          )}
        </section>

        {/* RIGHT: Order summary */}
        <section aria-label="Cart summary" className="lg:sticky lg:top-6 lg:self-start">
          <OrderSummary />
        </section>
      </div>

      {/* Form modal */}
      <AddressForm
        open={showForm}
        onClose={() => { if (!savingAddress) { setShowForm(false); setEditingAddress(null) } }}
        onSave={handleSave}
        initial={editingAddress}
        saving={savingAddress}
      />
    </main>
  )
}

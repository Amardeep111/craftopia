'use client'

import { useState, useCallback, useEffect } from 'react'
import dynamic from 'next/dynamic'
import {
  MapPin, Compass, ChevronDown, ChevronUp,
  User, Home, Building, Check, Navigation, Loader2,
} from 'lucide-react'
import { cn } from '@/lib/cn'
import Input from '@/components/ui/Input'
import Modal from '@/components/ui/Modal'
import Select from '@/components/ui/Select'
import { ADDRESS_TYPES, validateAddress, blankAddress } from '@/lib/address'
import { STATE_OPTIONS, getStateAndCityFromPin, normalizeStateName, normalizeCountryName } from '@/lib/address/india'

const InteractiveLocationPicker = dynamic(() => import('./InteractiveLocationPicker'), {
  ssr: false,
  loading: () => <div className="rounded-2xl bg-ivory p-6 text-center text-sm text-muted" role="status">Loading location tools…</div>,
})

export default function AddressForm({ open, onClose, onSave, initial = null, saving = false }) {
  const [data, setData] = useState(initial ? { ...initial } : blankAddress())
  const [errors, setErrors] = useState({})
  const [openSections, setOpenSections] = useState({ info: true, address: true, location: true, prefs: true })
  const [addressMode, setAddressMode] = useState(initial ? 'manual' : 'method-selection') // 'method-selection' | 'manual' | 'location' | 'manual-after-location'
  const [confirmedLocationData, setConfirmedLocationData] = useState(null)
  const [submitting, setSubmitting] = useState(false)

  const isSaving = saving || submitting

  useEffect(() => {
    if (initial) {
      setData({ ...initial })
      setAddressMode('manual')
    } else {
      setData(blankAddress())
      setAddressMode('method-selection')
    }
    setErrors({})
    setConfirmedLocationData(null)
    setSubmitting(false)
  }, [initial, open])

  const toggle = (k) => setOpenSections((s) => ({ ...s, [k]: !s[k] }))
  const update = (k, v) => { setData((d) => ({ ...d, [k]: v })); if (errors[k]) setErrors((e) => ({ ...e, [k]: '' })) }

  const resolvePincode = (pin) => {
    // 1. Instant 0ms local lookup
    const local = getStateAndCityFromPin(pin)
    if (local) {
      setData((d) => ({
        ...d,
        pinCode: pin,
        state: local.state || d.state,
        city: d.city || local.city || '',
      }))
      setErrors((e) => ({
        ...e,
        pinCode: '',
        state: local.state ? '' : e.state,
        city: local.city ? '' : e.city,
      }))
    }

    // 2. Strict 2-second bounded enrichment for district/city name
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), 2000)

    fetch(`https://api.postalpincode.in/pincode/${pin}`, { signal: controller.signal })
      .then((res) => res.json())
      .then((result) => {
        clearTimeout(timer)
        if (Array.isArray(result) && result[0]?.Status === 'Success' && result[0]?.PostOffice?.length) {
          const po = result[0].PostOffice[0]
          const stateName = po.State
          const cityName = po.District || po.Block || po.Division || ''
          setData((d) => ({
            ...d,
            state: stateName || d.state,
            city: d.city || cityName || '',
          }))
          setErrors((e) => ({
            ...e,
            state: stateName ? '' : e.state,
            city: cityName ? '' : e.city,
          }))
        }
      })
      .catch(() => {
        clearTimeout(timer)
      })
  }

  const handlePinChange = (val) => {
    const pin = val.replace(/\D/g, '').slice(0, 6)
    update('pinCode', pin)
    if (pin.length === 6) {
      resolvePincode(pin)
    }
  }

  const handlePinBlur = () => {
    const pin = (data.pinCode || '').replace(/\D/g, '').slice(0, 6)
    if (pin.length === 6) {
      resolvePincode(pin)
    }
  }

  const handleLocationConfirm = (locData) => {
    const updates = {}
    if (locData.areaStreet || locData.street || locData.area) updates.areaStreet = locData.areaStreet || locData.street || locData.area || data.areaStreet || ''
    if (locData.city) updates.city = locData.city
    if (locData.state || locData.pinCode) updates.state = normalizeStateName(locData.state, locData.pinCode)
    if (locData.pinCode) updates.pinCode = locData.pinCode
    updates.country = normalizeCountryName(locData.country) || 'India'
    if (locData.formattedAddress && !updates.areaStreet) updates.areaStreet = locData.formattedAddress
    if (locData.houseFlatBuilding) updates.houseFlatBuilding = locData.houseFlatBuilding
    if (locData.landmark) updates.landmark = locData.landmark
    // Coordinates for potential future use (optional, not required by form)
    if (locData.coordinates) {
      updates.lat = locData.coordinates.lat
      updates.lng = locData.coordinates.lng
    }
    setData((d) => ({ ...d, ...updates }))
    setConfirmedLocationData({
      ...locData,
      state: updates.state || locData.state,
      country: updates.country,
    })
    setAddressMode('manual-after-location')
    setErrors({})
  }

  const submit = async (e) => {
    e.preventDefault()
    if (isSaving) return
    const errs = validateAddress(data)
    setErrors(errs)
    if (Object.keys(errs).length === 0) {
      setSubmitting(true)
      try {
        await onSave({ ...data })
      } finally {
        setSubmitting(false)
      }
    }
  }

  const SectionHead = ({ icon: Icon, title, k }) => (
    <button type="button" onClick={() => toggle(k)} className="w-full flex items-center gap-2 py-2 text-left focus:outline-none" aria-expanded={openSections[k]}>
      <Icon className="h-4 w-4 text-accent" aria-hidden="true" />
      <span className="text-sm font-semibold text-ink">{title}</span>
      <span className="ml-auto text-sand">{openSections[k] ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}</span>
    </button>
  )

  if (!open) return null

  return (
    <Modal open={open} onClose={onClose} dismissible={!isSaving} title={initial ? 'Edit address' : 'Add a delivery address'} description="Choose your location or enter the address where you’d like your order delivered." maxWidth="max-w-2xl" className="studio-address-dialog">
        {/* ====== METHOD SELECTION (only initially) ====== */}
        {addressMode === 'method-selection' && (
          <div className="grid gap-3 mb-2">
            <button
              type="button"
              onClick={() => setAddressMode('location')}
              className="studio-address-method"
            >
              <Compass className="mt-0.5 h-5 w-5 shrink-0 text-brand" aria-hidden="true" />
              <div>
                <p className="text-base font-semibold">Use your current location</p>
                <p className="mt-1 text-sm text-muted">Locate your area, then confirm your delivery details.</p>
              </div>
            </button>
            <button
              type="button"
              onClick={() => setAddressMode('manual')}
              className="studio-address-method"
            >
              <MapPin className="mt-0.5 h-5 w-5 shrink-0 text-brand" aria-hidden="true" />
              <div>
                <p className="text-base font-semibold text-brand">Enter address manually</p>
                <p className="text-sm text-muted">Type your full delivery address yourself.</p>
              </div>
            </button>
          </div>
        )}

        {/* ====== LOCATION PICKER FLOW ====== */}
        {addressMode === 'location' && (
          <div className="space-y-3 mb-6">
            <div className="flex items-center justify-between gap-3 mb-3">
              <h3 className="font-display text-xl text-brand flex items-center gap-2"><Compass className="h-5 w-5 text-accent" aria-hidden="true" /> Use current location</h3>
            </div>
            <button type="button" onClick={() => setAddressMode('method-selection')} className="mb-3 text-xs font-semibold text-accent hover:text-brand underline underline-offset-2">← Change method</button>
            <InteractiveLocationPicker
              initialLat={data.lat || null}
              initialLng={data.lng || null}
              onConfirm={handleLocationConfirm}
              onCancel={() => setAddressMode('method-selection')}
              onBack={() => setAddressMode('method-selection')}
            />
          </div>
        )}

        {/* ====== UNIFIED MANUAL FORM (manual OR after location confirm) ====== */}
        {(addressMode === 'manual' || addressMode === 'manual-after-location') && (
          <div>
            <button type="button" onClick={() => { setAddressMode('method-selection'); setConfirmedLocationData(null); }} className="mb-4 text-xs font-semibold text-accent hover:text-brand underline underline-offset-2">← Change method</button>
            {confirmedLocationData && (
              <div className="rounded-lg bg-sage/50 p-4 mb-4">
                <p className="text-sm text-moss font-semibold">Location detected from GPS · <span className="text-xs font-normal text-muted">{confirmedLocationData.city || ''}, {confirmedLocationData.state || ''}</span></p>
              </div>
            )}
          </div>
        )}

        {/* ====== MANUAL FORM (visible when manual or manual-after-location) ====== */}
        {(addressMode === 'manual' || addressMode === 'manual-after-location') && (
          <form onSubmit={submit} className="space-y-4" noValidate>
          {/* Contact Info */}
          <section className="studio-address-section" aria-label="Contact information">
            <SectionHead icon={User} title="Contact information" k="info" />
            {openSections.info && (
              <div className="grid gap-4 sm:grid-cols-2 pt-3">
                <Input label="Full name" value={data.fullName} onChange={(e) => update('fullName', e.target.value)} error={errors.fullName} placeholder="Enter your full name" autoComplete="name" />
                <Input label="Mobile number" value={data.mobileNumber} onChange={(e) => update('mobileNumber', e.target.value)} error={errors.mobileNumber} placeholder="9876543210" autoComplete="tel-national" type="tel" />
              </div>
            )}
          </section>

          {/* Address Lines */}
          <section className="studio-address-section" aria-label="Address details">
            <SectionHead icon={Home} title="Address details" k="address" />
            {openSections.address && (
              <div className="space-y-4 pt-3">
                <div className="grid gap-4 sm:grid-cols-2">
                  <Input label="House / Flat / Building *" value={data.houseFlatBuilding} onChange={(e) => update('houseFlatBuilding', e.target.value)} error={errors.houseFlatBuilding} placeholder="Flat 4B, Shalom Apartments" autoComplete="address-line1" />
                  <Input label="Area / Street *" value={data.areaStreet} onChange={(e) => update('areaStreet', e.target.value)} error={errors.areaStreet} placeholder="Andheri West, Linking Road" autoComplete="address-line2" />
                </div>
                <Input label="Landmark (Optional)" value={data.landmark || ''} onChange={(e) => update('landmark', e.target.value)} placeholder="Near Juhu Beach, opposite ICICI Bank" autoComplete="address-line3" />
              </div>
            )}
          </section>

          {/* Location */}
          <section className="studio-address-section" aria-label="Location">
            <SectionHead icon={MapPin} title="Location" k="location" />
            {openSections.location && (
              <div className="pt-3 space-y-4">
                <div>
                  <label htmlFor="pin-code" className="block text-sm font-medium text-brand mb-1">PIN code *</label>
                  <div className="flex gap-2">
                    <input
                      id="pin-code"
                      type="text"
                      inputMode="numeric"
                      maxLength={6}
                      value={data.pinCode}
                      onChange={(e) => handlePinChange(e.target.value)}
                      onBlur={handlePinBlur}
                      className={cn('w-36 rounded-lg border bg-surface px-4 py-3 text-sm outline-none transition focus:ring-2', errors.pinCode ? 'border-bloom focus:ring-bloom/30' : 'border-sand focus:ring-bloom/30')}
                      placeholder="400001"
                      autoComplete="postal-code"
                    />
                  </div>
                  {errors.pinCode && <p className="mt-1.5 text-sm text-accent">{errors.pinCode}</p>}
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Input label="City *" value={data.city} onChange={(e) => update('city', e.target.value)} error={errors.city} placeholder="Mumbai" autoComplete="address-level2" />
                  <div>
                    <label htmlFor="addr-state" className="block text-sm font-medium text-brand mb-1">State *</label>
                    <Select
                      id="addr-state"
                      ariaLabel="State"
                      value={data.state}
                      onChange={(v) => update('state', v)}
                      options={STATE_OPTIONS}
                      placeholder="Select state"
                      error={!!errors.state}
                      className="!w-full"
                    />
                    {errors.state && <p className="mt-1.5 text-sm text-accent">{errors.state}</p>}
                  </div>
                </div>
              </div>
            )}
          </section>

          {/* Preferences */}
          <section className="studio-address-section" aria-label="Address preferences">
            <SectionHead icon={Building} title="Preferences" k="prefs" />
            {openSections.prefs && (
              <div className="pt-3 grid gap-4 sm:grid-cols-2">
                <div>
                  <label htmlFor="addr-type" className="block text-sm font-medium text-brand mb-1">Address type</label>
                  <Select
                    id="addr-type"
                    ariaLabel="Address type"
                    value={data.addressType}
                    onChange={(v) => update('addressType', v)}
                    options={ADDRESS_TYPES.map((t) => ({ value: t.id, label: t.label }))}
                    placeholder="Select address type"
                    className="!w-full"
                  />
                </div>
                <label className="flex items-center gap-3 rounded-lg border border-sand bg-surface px-4 py-3 cursor-pointer transition hover:border-bloom/30"><input type="checkbox" checked={!!data.isDefault} onChange={(e) => update('isDefault', e.target.checked)} className="h-5 w-5 rounded border-sand text-accent focus:ring-2 focus:ring-bloom/30" /><span className="text-sm font-medium text-brand">Set as default address</span></label>
              </div>
            )}
          </section>

          <div className="studio-dialog-actions">
            <button
              type="button"
              onClick={onClose}
              disabled={isSaving}
              className="studio-button-secondary rounded-lg px-5 py-3 text-sm font-semibold transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="studio-button-primary inline-flex items-center justify-center gap-2 rounded-lg px-6 py-3 text-sm font-semibold transition-colors disabled:opacity-60 min-w-[145px]"
            >
              {isSaving && <Loader2 className="h-4 w-4 animate-spin text-on-primary" aria-hidden="true" />}
              <span>
                {isSaving
                  ? (initial ? 'Updating address…' : 'Saving address…')
                  : (initial ? 'Update address' : 'Save address')}
              </span>
            </button>
          </div>
        </form>
        )}
    </Modal>
  )
}

/**
 * Address store — backed by localStorage.
 *
 * Matches the cart's zustand+persist pattern. When the project gains a real
 * authenticated user model, the same selector interface (getAddresses,
 * addAddress, updateAddress, removeAddress, setDefault) can be replaced by
 * API calls without touching components.
 *
 * Storage key: 'jamaes:address'
 * - addresses: Address[]
 * - selectedAddressId: string | null  (the user's chosen delivery address)
 */

import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export const ADDRESS_EVENT = 'jamaes:address:change'

function notifyChange() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event(ADDRESS_EVENT))
  }
}

function genId() {
  return 'addr_' + Math.random().toString(36).slice(2, 10) + Date.now().toString(36)
}

const blank = () => ({
  fullName: '',
  mobileNumber: '',
  houseFlatBuilding: '',
  areaStreet: '',
  landmark: '',
  city: '',
  state: '',
  pinCode: '',
  addressType: 'home',
  isDefault: false,
})

export const ADDRESS_TYPES = [
  { id: 'home', label: 'Home' },
  { id: 'work', label: 'Work' },
  { id: 'other', label: 'Other' },
]

export const useAddressStore = create(
  persist(
    (set, get) => ({
      addresses: [],
      selectedAddressId: null,
      hydrated: false,

      addAddress(data) {
        const now = new Date().toISOString()
        const isDefault = !!data.isDefault
        const addresses = get().addresses
        const newAddr = {
          id: data.id || genId(),
          fullName: data.fullName.trim(),
          mobileNumber: data.mobileNumber.trim(),
          houseFlatBuilding: data.houseFlatBuilding.trim(),
          areaStreet: data.areaStreet.trim(),
          landmark: (data.landmark || '').trim(),
          city: data.city.trim(),
          state: data.state.trim(),
          pinCode: data.pinCode.trim(),
          addressType: data.addressType || 'home',
          isDefault,
          createdAt: now,
          updatedAt: now,
        }

        // First address is automatically default.
        const becameFirst = addresses.length === 0
        if (becameFirst) newAddr.isDefault = true

        let next = [...addresses, newAddr]
        if (newAddr.isDefault) {
          next = next.map((a) => ({ ...a, isDefault: a.id === newAddr.id }))
        }
        set({ addresses: next, selectedAddressId: newAddr.id })
        notifyChange()
        return newAddr
      },

      updateAddress(id, data) {
        const now = new Date().toISOString()
        const isDefault = !!data.isDefault
        let next = get().addresses.map((a) =>
          a.id === id
            ? {
                ...a,
                fullName: data.fullName.trim(),
                mobileNumber: data.mobileNumber.trim(),
                houseFlatBuilding: data.houseFlatBuilding.trim(),
                areaStreet: data.areaStreet.trim(),
                landmark: (data.landmark || '').trim(),
                city: data.city.trim(),
                state: data.state.trim(),
                pinCode: data.pinCode.trim(),
                addressType: data.addressType || 'home',
                isDefault,
                updatedAt: now,
              }
            : a
        )
        if (isDefault) {
          next = next.map((a) => ({ ...a, isDefault: a.id === id }))
        }
        set({ addresses: next })
        notifyChange()
      },

      removeAddress(id) {
        const remaining = get().addresses.filter((a) => a.id !== id)
        // If we removed the default and others exist, promote the most recently
        // updated remaining address to default so the system never has a
        // "selected default that doesn't exist" state.
        let promoted = null
        if (remaining.length > 0) {
          const hadDefault = get().addresses.find((a) => a.id === id)?.isDefault
          if (hadDefault) {
            const sorted = [...remaining].sort(
              (a, b) => new Date(b.updatedAt) - new Date(a.updatedAt)
            )
            sorted[0].isDefault = true
            promoted = sorted[0].id
          }
        }
        const nextSelected =
          get().selectedAddressId === id
            ? promoted || (remaining[0]?.id ?? null)
            : get().selectedAddressId
        set({ addresses: remaining, selectedAddressId: nextSelected })
        notifyChange()
      },

      setDefault(id) {
        const next = get().addresses.map((a) => ({
          ...a,
          isDefault: a.id === id,
          updatedAt: a.id === id ? new Date().toISOString() : a.updatedAt,
        }))
        set({ addresses: next })
        notifyChange()
      },

      setAddresses(addresses) {
        const list = Array.isArray(addresses) ? addresses : []
        const current = get().selectedAddressId
        const selected = list.some((address) => address.id === current)
          ? current
          : (list.find((address) => address.isDefault)?.id || list[0]?.id || null)
        set({ addresses: list, selectedAddressId: selected, hydrated: true })
        notifyChange()
      },

      selectAddress(id) {
        set({ selectedAddressId: id })
        notifyChange()
      },

      clearSelection() {
        set({ selectedAddressId: null })
        notifyChange()
      },

      getDefaultAddress() {
        return get().addresses.find((a) => a.isDefault) || get().addresses[0] || null
      },

      getSelectedAddress() {
        const { addresses, selectedAddressId } = get()
        if (selectedAddressId) {
          const found = addresses.find((a) => a.id === selectedAddressId)
          if (found) return found
        }
        return get().getDefaultAddress()
      },
    }),
    {
      name: 'jamaes:address',
      onRehydrateStorage: () => (state) => {
        if (state) state.hydrated = true
      },
    }
  )
)

/* ─── Validation ──────────────────────────────────────────────────────── */

const PIN_RE = /^[1-9][0-9]{5}$/
const MOBILE_RE = /^[6-9]\d{9}$/ // Indian 10-digit mobile, starts 6-9

export function validateAddress(data) {
  const errors = {}
  if (!data.fullName || data.fullName.trim().length < 2) {
    errors.fullName = 'Please enter a full name.'
  } else if (!/^[a-zA-Z\s'.-]{2,}$/.test(data.fullName.trim())) {
    errors.fullName = 'Please enter a valid name.'
  }
  const mobile = (data.mobileNumber || '').replace(/\D/g, '')
  if (!mobile) {
    errors.mobileNumber = 'Please enter a mobile number.'
  } else if (!MOBILE_RE.test(mobile)) {
    errors.mobileNumber = 'Please enter a valid 10-digit Indian mobile number.'
  }
  if (!data.houseFlatBuilding || !data.houseFlatBuilding.trim()) {
    errors.houseFlatBuilding = 'House / flat / building is required.'
  }
  if (!data.areaStreet || !data.areaStreet.trim()) {
    errors.areaStreet = 'Area / street is required.'
  }
  if (!data.city || !data.city.trim()) {
    errors.city = 'City is required.'
  }
  if (!data.state || !data.state.trim()) {
    errors.state = 'State is required.'
  }
  const pin = (data.pinCode || '').replace(/\D/g, '')
  if (!pin) {
    errors.pinCode = 'PIN code is required.'
  } else if (!PIN_RE.test(pin)) {
    errors.pinCode = 'Please enter a valid 6-digit Indian PIN code.'
  }
  return errors
}

export function blankAddress() {
  return { ...blank() }
}

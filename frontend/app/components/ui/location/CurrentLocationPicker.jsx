/**
 * Free geolocation picker (no Mapbox token needed).
 */
'use client'

import { useState } from 'react'
import { MapPin, Loader2 } from 'lucide-react'

export default function CurrentLocationPicker({ onSelect, disabled }) {
  const [loading, setLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')

  async function handleUseCurrent() {
    setLoading(true)
    setErrorMsg('')
    let resolved = false

    function handleSuccess(position) {
      if (resolved) return
      resolved = true
      setLoading(false)
      onSelect?.({ lat: position.coords.latitude, lng: position.coords.longitude, source: 'geolocation' })
    }

    async function fallbackToIp() {
      if (resolved) return
      resolved = true
      try {
        const res = await fetch('/api/location/detect')
        const json = await res.json()
        if (json.success && json.data?.lat && json.data?.lng) {
          setLoading(false)
          onSelect?.({ lat: json.data.lat, lng: json.data.lng, source: 'network-ip' })
          return
        }
      } catch (_) {}
      setLoading(false)
      setErrorMsg('Could not detect location. Please enter manually.')
    }

    if (!navigator.geolocation) {
      fallbackToIp()
      return
    }

    // Browser geolocation is PRIMARY.
    navigator.geolocation.getCurrentPosition(
      handleSuccess,
      (err1) => {
        if (err1.code === 1) {
          setLoading(false)
          setErrorMsg('Location permission denied. Please enter manually.')
          return
        }
        navigator.geolocation.getCurrentPosition(
          handleSuccess,
          (err2) => {
            if (err2.code === 1) {
              setLoading(false)
              setErrorMsg('Location permission denied. Please enter manually.')
              return
            }
            // Pure fallback: both browser geolocation attempts failed or timed out
            fallbackToIp()
          },
          { enableHighAccuracy: false, timeout: 8000, maximumAge: 60000 }
        )
      },
      { enableHighAccuracy: true, timeout: 7000, maximumAge: 0 }
    )
  }

  return (
    <div className="space-y-2">
      <button type="button" onClick={handleUseCurrent} disabled={disabled || loading} className="inline-flex items-center gap-2 rounded-full bg-plum/10 border-2 border-plum/20 text-plum px-4 py-2 text-sm font-semibold hover:bg-plum hover:text-cream transition">
        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <MapPin className="h-4 w-4" />}
        Use my current location
      </button>
      {errorMsg && <p className="text-xs text-bloom">{errorMsg}</p>}
    </div>
  )
}

'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import mapboxgl from 'mapbox-gl'
import 'mapbox-gl/dist/mapbox-gl.css'
import { MapPin, RefreshCcw, Crosshair, AlertCircle, Loader2, Navigation, LocateFixed } from 'lucide-react'
import CurrentLocationPicker from '@/components/ui/location/CurrentLocationPicker'
import Select from '@/components/ui/Select'
import { STATE_OPTIONS, getStateAndCityFromPin } from '@/lib/address/india'

/*
 * Real, production Mapbox location picker with free geolocation fallback.
 *
 * Flow:
 *  1. On mount, check if Mapbox token is available.
 *  2. If YES: Use Mapbox for map tiles + reverse geocoding via server route.
 *  3. If NO: Fall back to free browser geolocation (navigator.geolocation).
 *  4. User reviews detected address, enters Flat/House + optional Landmark.
 *  5. On confirm, return payload to parent form (AddressForm).
 *
 * The public mapbox token (NEXT_PUBLIC_MAPBOX_TOKEN) is only used to render
 * tiles on the client. Reverse-geocoding goes through the server route so
 * the secret token is never exposed.
 */

const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN || ''

const FALLBACK_CENTER = { lat: 20.5937, lng: 78.9629 } // India centroid (only used until GPS resolves)

export default function InteractiveLocationPicker({
  initialLat = null,
  initialLng = null,
  onConfirm,
  onCancel,
  onBack,
}) {
  const mapContainerRef = useRef(null)
  const mapRef = useRef(null)
  const markerRef = useRef(null)
  // mapStatus drives a deterministic lifecycle so the UI can never stay
  // in "loading" forever. Transitions: idle → initializing → loading → ready | error
  const [mapStatus, setMapStatus] = useState('idle')
  const [mapReady, setMapReady] = useState(false)
  const [mapError, setMapError] = useState('')
  const [initKey, setInitKey] = useState(0) // bump to force re-initialization on retry
  const loadTimeoutRef = useRef(null)
  // Latest-status ref so the load-timeout callback (created once) can read
  // the current value without re-binding.
  const mapStatusRef = useRef('idle')
  const [locating, setLocating] = useState(false)
  const [reverseGeocoding, setReverseGeocoding] = useState(false)
  const [permissionDenied, setPermissionDenied] = useState(false)
  const [networkError, setNetworkError] = useState('')
  const [locationData, setLocationData] = useState(null) // { street, area, city, state, pinCode, country, formattedAddress, coordinates }
  const [markerPosition, setMarkerPosition] = useState({ lat: initialLat, lng: initialLng })
  const [houseFlat, setHouseFlat] = useState('')
  const [landmark, setLandmark] = useState('')
  const [resolved, setResolved] = useState(false)

  // ── Initialize Mapbox map ───────────────────────────────────────────────
  // Lifecycle: idle → initializing → loading → ready | error
  // The state MUST reach `ready` or `error` — it can never stay in
  // `loading` forever. A 20-second safety timeout guarantees that.
  useEffect(() => {
    if (!MAPBOX_TOKEN) {
      // No Mapbox token — fall back to free geolocation picker (no tile map).
      // We still set status to ready so the user can click "Use my location".
      setMapStatus('ready')
      setMapReady(true)
      setMapError('')
      console.warn('Mapbox token missing; using free geolocation fallback (no map tiles).')
      // Do NOT initialize mapboxgl.Map — skip everything below.
      return
    }

    if (!mapContainerRef.current) return
    if (mapRef.current) return

    setMapStatus('initializing')
    setMapReady(false)

    let map
    try {
      mapboxgl.accessToken = MAPBOX_TOKEN

      // Ensure the container has measurable size before we hand it to Mapbox.
      // If it does not (e.g. still inside a hidden modal), defer once until
      // the next animation frame so layout has settled.
      const rect = mapContainerRef.current.getBoundingClientRect()
      if (rect.width === 0 || rect.height === 0) {
        const raf = requestAnimationFrame(() => {
          // Re-run this effect by bumping initKey
          setInitKey((k) => k + 1)
        })
        return () => cancelAnimationFrame(raf)
      }

      map = new mapboxgl.Map({
        container: mapContainerRef.current,
        style: 'mapbox://styles/mapbox/streets-v12',
        center: [initialLng || FALLBACK_CENTER.lng, initialLat || FALLBACK_CENTER.lat],
        zoom: initialLat != null ? 16 : 4,
        attributionControl: true,
        // Helpful when running inside a modal: keep tiles reasonable
        minZoom: 2,
        maxZoom: 19,
      })

      // Navigation control (zoom in/out, compass)
      try {
        map.addControl(new mapboxgl.NavigationControl({ showCompass: false }), 'top-right')
      } catch (_) {
        /* non-fatal */
      }

      mapRef.current = map
      setMapStatus('loading')

      // Safety net: if neither `load` nor `error` fires within 20s, force
      // transition to error so the UI never stays in "Loading map..." forever.
      loadTimeoutRef.current = setTimeout(() => {
        if (mapStatusRef.current === 'ready' || mapStatusRef.current === 'error') return
        // eslint-disable-next-line no-console
        console.warn('[Mapbox] load timeout — no load/error event in 20s')
        setMapStatus('error')
        setMapError(
          'The map is taking too long to load. Please try again or enter your address manually.'
        )
      }, 20000)

      // Success: real Mapbox load event has fired.
      const handleLoad = () => {
        if (loadTimeoutRef.current) {
          clearTimeout(loadTimeoutRef.current)
          loadTimeoutRef.current = null
        }
        setMapStatus('ready')
        setMapReady(true)
        // Make sure the canvas matches the now-visible container.
        try {
          map.resize()
        } catch (_) {
          /* noop */
        }
        // If we already had an initial coordinate, place the marker now.
        if (initialLat != null && initialLng != null) {
          placeMarker(initialLng, initialLat, map)
        }
      }

      // Failure: a real Mapbox error. Transition to error so the UI
      // can offer retry / manual entry instead of hanging on "Loading map...".
      const handleError = (e) => {
        const err = e?.error || e
        // eslint-disable-next-line no-console
        console.error('[Mapbox] map error', err)
        if (loadTimeoutRef.current) {
          clearTimeout(loadTimeoutRef.current)
          loadTimeoutRef.current = null
        }
        setMapStatus('error')
        // Detect an invalid token / 401 so the developer can spot the
        // configuration issue in the dev console right away.
        const isAuthError = err && (
          err?.status === 401 || err?.status === 403 ||
          /access[_\s-]?token/i.test(err?.message || '') ||
          /unauthorized/i.test(err?.message || '')
        )
        if (isAuthError && process.env.NODE_ENV !== 'production') {
          // eslint-disable-next-line no-console
          console.warn(
            '[Mapbox] Access token is invalid. Replace NEXT_PUBLIC_MAPBOX_TOKEN in .env.local with a real token from https://account.mapbox.com/access-tokens/'
          )
        }
        setMapError(
          "We couldn't load the map. Please try again or enter your address manually."
        )
      }

      map.on('load', handleLoad)
      map.on('error', handleError)

      // Click to move the pin — deferred attachment so reverseGeocode is available.
      const clickHandler = (e) => {
        const { lng, lat } = e.lngLat
        placeMarker(lng, lat, map)
        setMarkerPosition({ lat, lng })
        if (typeof reverseGeocode === 'function') reverseGeocode(lat, lng)
      }
      map.on('click', clickHandler)

      // Defensive: in some edge cases (e.g. style 401) Mapbox fires
      // `style.load` instead of `load`. Either marks the map as usable.
      map.on('style.load', () => {
        if (mapStatusRef.current !== 'ready') handleLoad()
      })
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error('[Mapbox] init error', e)
      if (loadTimeoutRef.current) {
        clearTimeout(loadTimeoutRef.current)
        loadTimeoutRef.current = null
      }
      setMapStatus('error')
      setMapError('Map service could not be loaded. Please try again or use manual entry.')
      return
    }

    return () => {
      if (loadTimeoutRef.current) {
        clearTimeout(loadTimeoutRef.current)
        loadTimeoutRef.current = null
      }
      try { markerRef.current?.remove() } catch (_) { /* noop */ }
      try { mapRef.current?.remove() } catch (_) { /* noop */ }
      markerRef.current = null
      mapRef.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initKey])

  // Sync mapStatusRef with the latest state (so the timeout callback can read it).
  useEffect(() => {
    mapStatusRef.current = mapStatus
  }, [mapStatus])

  // ── Reverse-geocode via server route ────────────────────────────────────
  const reverseGeocode = useCallback(async (lat, lng) => {
    setReverseGeocoding(true)
    setNetworkError('')
    try {
      const res = await fetch('/api/geocode', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lat, lng }),
      })
      const data = await res.json()
      if (data.success && data.address) {
        setLocationData({ ...data.address, coordinates: { lat, lng } })
        setResolved(true)
      } else {
        setLocationData({ error: data.error || 'Could not retrieve address from this location.' })
        setResolved(false)
      }
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error('[Geocode] network error', e)
      setNetworkError('Location services are temporarily unavailable. Please try again or enter your address manually.')
      setLocationData({ error: 'Connection error while retrieving address.' })
    } finally {
      setReverseGeocoding(false)
    }
  }, [])

  // Place or move the marker on an existing map instance.
  const placeMarker = useCallback((lng, lat, map) => {
    if (!map) return
    if (!markerRef.current) {
      const el = document.createElement('div')
      el.style.cssText =
        'width:28px;height:28px;border-radius:50% 50% 50% 0;background:#a14a7a;transform:rotate(-45deg);box-shadow:0 2px 6px rgba(0,0,0,.35);border:2px solid #fff;'
      el.setAttribute('aria-label', 'Detected location')
      markerRef.current = new mapboxgl.Marker({ element: el, draggable: true })
        .setLngLat([lng, lat])
        .addTo(map)
      markerRef.current.on('dragend', () => {
        const { lng: nlng, lat: nlat } = markerRef.current.getLngLat()
        setMarkerPosition({ lat: nlat, lng: nlng })
        // reverseGeocode is defined below; this closure reads from component scope.
        // Use the stable function reference from the current render.
        setTimeout(() => { if (typeof reverseGeocode === 'function') reverseGeocode(nlat, nlng) }, 0)
      })
    } else {
      markerRef.current.setLngLat([lng, lat])
    }
  }, [])

  // ── Request browser GPS ────────────────────────────────────────────────
  const requestLocation = useCallback(() => {
    setLocating(true)
    setPermissionDenied(false)
    setLocationData(null)
    setMapError('')
    setNetworkError('')

    let resolvedLoc = false

    const handleSuccess = (pos) => {
      if (resolvedLoc) return
      resolvedLoc = true
      const lat = pos.coords.latitude
      const lng = pos.coords.longitude
      if (typeof lat !== 'number' || typeof lng !== 'number' || Number.isNaN(lat) || Number.isNaN(lng)) {
        fallbackToIp()
        return
      }
      setMarkerPosition({ lat, lng })
      if (mapRef.current && mapStatusRef.current === 'ready') {
        mapRef.current.flyTo({ center: [lng, lat], zoom: 16, essential: true })
        placeMarker(lng, lat, mapRef.current)
      } else if (mapRef.current) {
        try {
          mapRef.current.jumpTo({ center: [lng, lat], zoom: 16 })
        } catch (_) {
          /* noop */
        }
      }
      reverseGeocode(lat, lng)
      setLocating(false)
    }

    const fallbackToIp = async () => {
      if (resolvedLoc) return
      resolvedLoc = true
      try {
        const res = await fetch('/api/location/detect')
        const json = await res.json()
        if (json.success && json.data?.lat && json.data?.lng) {
          const { lat, lng, city, state, pinCode, country } = json.data
          setMarkerPosition({ lat, lng })
          if (mapRef.current && mapStatusRef.current === 'ready') {
            mapRef.current.flyTo({ center: [lng, lat], zoom: 15, essential: true })
            placeMarker(lng, lat, mapRef.current)
          } else if (mapRef.current) {
            try {
              mapRef.current.jumpTo({ center: [lng, lat], zoom: 15 })
            } catch (_) {
              /* noop */
            }
          }
          try {
            const geoRes = await fetch('/api/geocode', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ lat, lng }),
            })
            const geoData = await geoRes.json()
            if (geoData.success && geoData.address) {
              setLocationData({ ...geoData.address, coordinates: { lat, lng } })
              setResolved(true)
            } else {
              setLocationData({
                city: city || '',
                state: state || '',
                country: country || 'India',
                pinCode: pinCode || '',
                areaStreet: city ? `${city}, ${state}` : '',
                formattedAddress: [city, state, country].filter(Boolean).join(', '),
                coordinates: { lat, lng },
              })
              setResolved(true)
            }
          } catch (_) {
            setLocationData({
              city: city || '',
              state: state || '',
              country: country || 'India',
              pinCode: pinCode || '',
              areaStreet: city ? `${city}, ${state}` : '',
              formattedAddress: [city, state, country].filter(Boolean).join(', '),
              coordinates: { lat, lng },
            })
            setResolved(true)
          }
          setLocating(false)
          return
        }
      } catch (e) {
        console.warn('IP location fallback error:', e)
      }
      setLocating(false)
      setLocationData({ error: 'Could not detect your location. Please enter your address manually.' })
    }

    if (typeof window === 'undefined' || !navigator.geolocation) {
      fallbackToIp()
      return
    }

    // Browser geolocation is PRIMARY.
    // 1. Try High Accuracy GPS first (up to 7s).
    // 2. If unavailable (code 2) or timed out (code 3), try standard accuracy (up to 8s).
    // 3. ONLY if browser geolocation fails or times out (e.g. Firefox MLS disabled), fall back to IP location.
    // 4. If user explicitly denied permission (code 1), respect their choice and do not fall back.
    navigator.geolocation.getCurrentPosition(
      handleSuccess,
      (err1) => {
        if (err1.code === 1) {
          setLocating(false)
          setPermissionDenied(true)
          setLocationData({ error: 'Location permission was denied. You can enter your address manually.' })
          return
        }
        navigator.geolocation.getCurrentPosition(
          handleSuccess,
          (err2) => {
            if (err2.code === 1) {
              setLocating(false)
              setPermissionDenied(true)
              setLocationData({ error: 'Location permission was denied. You can enter your address manually.' })
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
  }, [reverseGeocode, placeMarker])

  // Retry: tear down any failed map and re-initialize.
  const handleRetry = useCallback(() => {
    if (loadTimeoutRef.current) {
      clearTimeout(loadTimeoutRef.current)
      loadTimeoutRef.current = null
    }
    try { markerRef.current?.remove() } catch (_) { /* noop */ }
    try { mapRef.current?.remove() } catch (_) { /* noop */ }
    markerRef.current = null
    mapRef.current = null
    setMapError('')
    setMapStatus('idle')
    setMapReady(false)
    setInitKey((k) => k + 1)
  }, [])

  // Auto-request location once map is ready, if no initial coords
  useEffect(() => {
    if (mapReady && initialLat == null && !resolved && !locationData) {
      requestLocation()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mapReady])

  // ── Confirm: send everything back to the parent form ───────────────────
  const handleConfirm = () => {
    if (!locationData || locationData.error) return
    onConfirm({
      ...locationData,
      houseFlatBuilding: houseFlat.trim(),
      landmark: landmark.trim(),
      coordinates: markerPosition,
    })
  }

  const updateDetectedAddress = (field, value) => {
    setLocationData((current) => {
      if (!current || current.error) return current
      if (field === 'areaStreet') return { ...current, areaStreet: value, street: value, area: value }
      if (field === 'pinCode') return { ...current, pinCode: value.replace(/\D/g, '').slice(0, 6) }
      return { ...current, [field]: value }
    })
  }

  const handleDetectedPinChange = (value) => {
    const pin = value.replace(/\D/g, '').slice(0, 6)
    updateDetectedAddress('pinCode', pin)
    if (pin.length === 6) {
      const local = getStateAndCityFromPin(pin)
      if (local) {
        setLocationData((current) => {
          if (!current || current.error) return current
          return {
            ...current,
            pinCode: pin,
            state: local.state || current.state,
            city: current.city || local.city || '',
          }
        })
      }
      // Strict 2-second bounded enrichment for district/city name
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
            setLocationData((current) => {
              if (!current || current.error) return current
              return {
                ...current,
                state: stateName || current.state,
                city: current.city || cityName || '',
              }
            })
          }
        })
        .catch(() => {
          clearTimeout(timer)
        })
    }
  }

  // ── Hard error state (token missing etc.) ──────────────────────────────
  if (mapError) {
    return (
      <div className="rounded-3xl bg-ivory/60 p-6" role="region" aria-label="Location picker error">
        <div className="flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-bloom shrink-0 mt-0.5" aria-hidden="true" />
          <div>
            <p className="text-sm font-semibold text-plum">{mapError}</p>
            <p className="text-xs text-muted mt-1">You can still enter your address manually below.</p>
          </div>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={handleRetry}
            className="inline-flex items-center gap-2 rounded-full bg-plum px-4 py-2 text-sm font-semibold text-cream hover:bg-ink transition"
          >
            <RefreshCcw className="h-4 w-4" aria-hidden="true" /> Try again
          </button>
          <button
            type="button"
            onClick={onBack || onCancel}
            className="rounded-full px-4 py-2 text-sm font-semibold text-muted ring-1 ring-sand hover:ring-bloom/40 transition"
          >
            Enter address manually
          </button>
        </div>
      </div>
    )
  }

  const isMapboxAvailable = !!MAPBOX_TOKEN

  // ── Map UI (conditional based on token availability) ──
  return (
    <div className="rounded-3xl overflow-hidden bg-cream shadow-soft ring-1 ring-sand" role="region" aria-label="Interactive location picker">
      {/* Map container or fallback UI */}
      <div className="relative">
        {/* Free geolocation fallback UI (no mapbox token) */}
        {!isMapboxAvailable && (
          <div className="relative w-full h-72 sm:h-80 md:h-72 bg-gradient-to-br from-sand/30 to-blush/20 flex flex-col items-center justify-center p-6" style={{ minHeight: 260 }}>
            {locating ? (
              <div className="text-center space-y-4">
                <div className="mx-auto h-16 w-16 rounded-full bg-bloom/10 flex items-center justify-center">
                  <Loader2 className="h-8 w-8 text-bloom animate-spin" aria-hidden="true" />
                </div>
                <div>
                  <h3 className="font-display text-lg text-plum">Detecting your location…</h3>
                  <p className="text-sm text-muted mt-1 max-w-xs mx-auto">
                    Please allow location permission in your browser if prompted.
                  </p>
                </div>
              </div>
            ) : (
              <div className="text-center space-y-4">
                <div className="mx-auto h-16 w-16 rounded-full bg-plum/10 flex items-center justify-center">
                  <LocateFixed className="h-8 w-8 text-plum" aria-hidden="true" />
                </div>
                <div>
                  <h3 className="font-display text-lg text-plum">Detect your location</h3>
                  <p className="text-sm text-muted mt-1">We'll use your browser's location to find your address</p>
                </div>
                <button
                  type="button"
                  onClick={requestLocation}
                  disabled={locating || reverseGeocoding}
                  className="inline-flex items-center gap-2 rounded-full bg-plum px-5 py-2.5 text-sm font-semibold text-cream shadow-soft hover:bg-ink transition disabled:opacity-50"
                >
                  <MapPin className="h-4 w-4" />
                  Use my current location
                </button>
              </div>
            )}
          </div>
        )}

        {/* Mapbox UI (when token available) */}
        {isMapboxAvailable && (
          <>
            <div ref={mapContainerRef} className="w-full h-72 sm:h-80 md:h-72 bg-sand/40" style={{ minHeight: 260 }} />

            {/* Loading overlay only during initialization / loading (never after ready or error) */}
            {(mapStatus === 'initializing' || mapStatus === 'loading' || locating) && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-sand/70 backdrop-blur-sm z-20">
                <Loader2 className="h-8 w-8 animate-spin text-bloom" aria-hidden="true" />
                <p className="mt-3 text-sm font-medium text-plum">
                  {locating ? 'Finding your location…' : (mapStatus === 'initializing' ? 'Initializing map…' : 'Loading map…')}
                </p>
              </div>
            )}

            <div className="absolute top-3 left-3 flex flex-wrap gap-2 z-10">
              <button
                type="button"
                onClick={requestLocation}
                disabled={locating || reverseGeocoding}
                className="inline-flex items-center gap-2 rounded-full bg-cream/95 px-3 py-2 text-xs font-bold text-plum shadow-md ring-1 ring-sand backdrop-blur-sm transition hover:bg-ivory disabled:opacity-50"
                aria-label="Use my current location"
              >
                <Crosshair className={`h-3.5 w-3.5 ${locating ? 'animate-pulse' : ''}`} aria-hidden="true" />
                {locating ? 'Finding…' : 'Use my location'}
              </button>
            </div>

            <div className="absolute bottom-3 right-3 z-10">
              <span className="inline-block rounded-full bg-ink/70 px-2.5 py-1 text-[10px] font-semibold text-cream backdrop-blur-sm">
                Drag pin to adjust
              </span>
            </div>
          </>
        )}
      </div>

      {/* Status messages + address form */}
      <div className="p-5 space-y-4">
        <div className="space-y-2">
          {reverseGeocoding && (
            <p className="text-sm text-bloom font-medium flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> Finding your address…
            </p>
          )}
          {permissionDenied && (
            <p className="text-sm text-bloom font-medium flex items-center gap-2">
              <AlertCircle className="h-4 w-4" aria-hidden="true" /> Location access was not allowed.
            </p>
          )}
          {networkError && (
            <p className="text-sm text-bloom font-medium flex items-center gap-2">
              <AlertCircle className="h-4 w-4" aria-hidden="true" /> {networkError}
            </p>
          )}
          {locationData?.error && !networkError && (
            <p className="text-sm text-bloom font-medium flex items-center gap-2">
              <AlertCircle className="h-4 w-4" aria-hidden="true" /> {locationData.error}
            </p>
          )}
        </div>

        {/* Let customers correct reverse-geocoded details before using them. */}
        {locationData && !locationData.error && (
          <div className="rounded-2xl bg-ivory/60 p-4 ring-1 ring-sand/60 space-y-4" role="region" aria-label="Detected address">
            <h3 className="font-display text-lg text-plum flex items-center gap-2">
              <MapPin className="h-5 w-5 text-bloom" aria-hidden="true" />
              Location detected
              <span className="ml-auto inline-flex items-center gap-1 rounded-full bg-sage/20 px-2 py-0.5 text-[10px] font-bold uppercase text-sage">
                <Navigation className="h-3 w-3" aria-hidden="true" /> GPS
              </span>
            </h3>
            <p className="text-sm text-muted">GPS can be imprecise. Review these details and edit anything that looks wrong.</p>
            <div className="grid gap-3 sm:grid-cols-2">
              <DetectedField label="Area / Street" value={locationData.areaStreet || locationData.street || locationData.area || ''} onChange={(value) => updateDetectedAddress('areaStreet', value)} />
              <DetectedField label="City" value={locationData.city || ''} onChange={(value) => updateDetectedAddress('city', value)} />
              <div>
                <label htmlFor="detected-state-select" className="block text-sm font-medium text-plum mb-1">State</label>
                <Select
                  id="detected-state-select"
                  value={locationData.state || ''}
                  onChange={(value) => updateDetectedAddress('state', value)}
                  options={STATE_OPTIONS}
                  placeholder="Select state"
                  className="!w-full !bg-cream !rounded-xl"
                />
              </div>
              <DetectedField label="PIN Code" value={locationData.pinCode || ''} onChange={handleDetectedPinChange} inputMode="numeric" maxLength={6} />
              <DetectedField label="Country" value={locationData.country || ''} onChange={(value) => updateDetectedAddress('country', value)} />
            </div>

            <div className="grid gap-3 pt-2">
              <div>
                <label htmlFor="house-flat" className="block text-sm font-medium text-plum mb-1">
                  House / Flat / Building Number <span className="text-bloom">*</span>
                </label>
                <input
                  id="house-flat"
                  type="text"
                  value={houseFlat}
                  onChange={(e) => setHouseFlat(e.target.value)}
                  placeholder="Flat 4B, Shalom Apartments"
                  className="w-full rounded-2xl border border-sand bg-cream px-4 py-3 text-sm text-plum placeholder:text-muted/60 outline-none transition focus:border-bloom focus:ring-2 focus:ring-bloom/20"
                  autoComplete="address-line1"
                />
              </div>
              <div>
                <label htmlFor="landmark-input" className="block text-sm font-medium text-plum mb-1">
                  Landmark <span className="text-muted font-normal">(Optional)</span>
                </label>
                <input
                  id="landmark-input"
                  type="text"
                  value={landmark}
                  onChange={(e) => setLandmark(e.target.value)}
                  placeholder="Near City Centre, opposite ICICI Bank"
                  className="w-full rounded-2xl border border-sand bg-cream px-4 py-3 text-sm text-plum placeholder:text-muted/60 outline-none transition focus:border-bloom focus:ring-2 focus:ring-bloom/20"
                  autoComplete="address-line3"
                />
              </div>
            </div>
          </div>
        )}

        <div className="flex flex-wrap gap-2 pt-2">
          <button
            type="button"
            onClick={requestLocation}
            disabled={!mapReady}
            className="rounded-full px-4 py-2.5 text-sm font-semibold text-plum ring-1 ring-sand hover:ring-bloom/40 transition bg-cream disabled:opacity-50"
            aria-label="Retry location detection"
          >
            <RefreshCcw className="h-3.5 w-3.5 inline mr-1" aria-hidden="true" /> Retry
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={!locationData || !!locationData.error || !houseFlat.trim()}
            className="rounded-full px-5 py-2.5 text-sm font-semibold text-cream shadow-soft bg-plum hover:bg-ink transition disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Confirm location
          </button>
          <button
            type="button"
            onClick={onBack || onCancel}
            className="rounded-full px-4 py-2.5 text-sm font-semibold text-muted hover:text-plum transition"
          >
            Choose a different address method
          </button>
        </div>
      </div>
    </div>
  )
}

function DetectedField({ label, value, onChange, inputMode, maxLength }) {
  return (
    <label className="block text-sm font-medium text-plum">
      {label}
      <input
        type="text"
        inputMode={inputMode}
        maxLength={maxLength}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="mt-1 w-full rounded-xl border border-sand bg-cream px-3 py-2.5 text-sm font-normal outline-none transition focus:border-bloom focus:ring-2 focus:ring-bloom/20"
      />
    </label>
  )
}

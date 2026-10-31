'use client'

import { useEffect, useState } from 'react'
import { Ticket, CheckCircle2, XCircle, AlertCircle, Sparkles, Clock } from 'lucide-react'

export default function CouponList({ initialCoupons }) {
  const hasInitial = Boolean(initialCoupons && (initialCoupons.available?.length || initialCoupons.used?.length || initialCoupons.exhausted?.length))
  const [available, setAvailable] = useState(() => initialCoupons?.available || [])
  const [used, setUsed] = useState(() => initialCoupons?.used || [])
  const [exhausted, setExhausted] = useState(() => initialCoupons?.exhausted || [])
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [loading, setLoading] = useState(() => !hasInitial)
  const [error, setError] = useState('')

  useEffect(() => {
    if (hasInitial) return
    async function load() {
      try {
        const authRes = await fetch('/api/auth/me')
        const authData = authRes.ok ? await authRes.json() : null
        setIsLoggedIn(Boolean(authData?.success && authData.data?.isLoggedIn))

        const res = await fetch('/api/coupons')
        const data = await res.json()
        if (!res.ok || !data.success) throw new Error(data.error || 'Failed.')
        setAvailable(data.data || [])
        setUsed(data.used || [])
        setExhausted(data.exhausted || [])
      } catch (e) {
        setError('Failed to load coupons.')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [hasInitial])

  if (loading) return <div className="py-8 text-center text-muted">Loading coupons...</div>
  if (error) return <div className="py-8 text-center text-red-600">{error}</div>

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <div className="flex items-center gap-3 mb-2">
        <div className="rounded-full bg-bloom/10 p-2"><Ticket className="h-6 w-6 text-bloom" /></div>
        <h2 className="font-display text-2xl text-plum">Available Coupons</h2>
      </div>
      <p className="text-sm text-muted mb-6">Eligible discounts you can apply at checkout.</p>

      {available.length === 0 && used.length === 0 && exhausted.length === 0 && (
        <div className="paper-card p-6 text-center text-muted">No coupons available right now.</div>
      )}

      {available.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
          {available.map((c) => (
            <div key={c.id} className="paper-card p-5 relative overflow-hidden border-2 border-bloom/20">
              <div className="absolute top-0 right-0 bg-bloom text-white text-[10px] font-bold px-2 py-0.5 rounded-bl-xl">AVAILABLE</div>
              <div className="mb-3">
                <h3 className="font-display text-lg text-plum">{c.label}</h3>
                <p className="text-xs font-mono text-muted uppercase tracking-widest">{c.code}</p>
              </div>
              <div className="space-y-2 text-sm text-plum/90">
                <div className="flex justify-between"><span>Discount</span><span className="font-semibold">{c.discountPercent}%</span></div>
                <div className="flex justify-between"><span>Min. cart</span><span>₹{c.minSubtotal || 0}</span></div>
                <div className="flex justify-between"><span>Uses left</span><span className="font-mono">{c.remainingUses !== null ? c.remainingUses : 'Unlimited'}</span></div>
              </div>
              {c.expiresAt && <p className="mt-3 text-xs text-muted flex items-center gap-1"><Clock className="h-3 w-3" /> Expires {new Date(c.expiresAt).toLocaleDateString()}</p>}
            </div>
          ))}
        </div>
      )}

      {isLoggedIn && used.length > 0 && (
        <div className="mb-8">
          <h3 className="font-display text-xl text-plum mb-3 flex items-center gap-2"><AlertCircle className="h-5 w-5 text-amber-600" /> Already used</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {used.map((c) => (
              <div key={c.id} className="paper-card p-5 opacity-70 bg-amber-50/40">
                <div className="flex items-start justify-between mb-2">
                  <div><h4 className="font-display text-lg text-plum">{c.label}</h4><p className="text-xs font-mono text-muted">{c.code}</p></div>
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-700"><AlertCircle className="h-3 w-3" /> Used</span>
                </div>
                <p className="text-sm text-plum/80">This first-time coupon has already been redeemed on your account.</p>
                {c.firstTimeOnly && <p className="text-xs text-muted mt-2">First-time only.</p>}
              </div>
            ))}
          </div>
        </div>
      )}

      {exhausted.length > 0 && (
        <div className="mb-8">
          <h3 className="font-display text-xl text-plum mb-3 flex items-center gap-2"><XCircle className="h-5 w-5 text-rose-600" /> Limit reached</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {exhausted.map((c) => (
              <div key={c.id} className="paper-card p-5 opacity-70 bg-rose-50/40">
                <div className="flex items-start justify-between mb-2">
                  <div><h4 className="font-display text-lg text-plum">{c.label}</h4><p className="text-xs font-mono text-muted">{c.code}</p></div>
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-rose-100 text-rose-700"><XCircle className="h-3 w-3" /> Limit reached</span>
                </div>
                <p className="text-sm text-plum/80">This coupon has reached its global usage limit.</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

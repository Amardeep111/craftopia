'use client'

import { Ticket, CheckCircle2, XCircle, AlertCircle, Sparkles, Clock } from 'lucide-react'

export default function CouponList({ initialCoupons, initialIsLoggedIn = false }) {
  const available = initialCoupons?.available || []
  const used = initialCoupons?.used || []
  const exhausted = initialCoupons?.exhausted || []
  const isLoggedIn = initialIsLoggedIn

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <div className="flex items-center gap-3 mb-2">
        <div className="rounded-full bg-bloom/10 p-2"><Ticket className="h-6 w-6 text-accent" /></div>
        <h2 className="font-display text-2xl text-brand">Available Coupons</h2>
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
                <h3 className="font-display text-lg text-brand">{c.label}</h3>
                <p className="text-xs font-mono text-muted uppercase tracking-widest">{c.code}</p>
              </div>
              <div className="space-y-2 text-sm text-brand/90">
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
          <h3 className="font-display text-xl text-brand mb-3 flex items-center gap-2"><AlertCircle className="h-5 w-5 text-warning" /> Already used</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {used.map((c) => (
              <div key={c.id} className="paper-card p-5 opacity-70 bg-warning-surface/40">
                <div className="flex items-start justify-between mb-2">
                  <div><h4 className="font-display text-lg text-brand">{c.label}</h4><p className="text-xs font-mono text-muted">{c.code}</p></div>
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-warning-surface text-warning"><AlertCircle className="h-3 w-3" /> Used</span>
                </div>
                <p className="text-sm text-brand/80">This first-time coupon has already been redeemed on your account.</p>
                {c.firstTimeOnly && <p className="text-xs text-muted mt-2">First-time only.</p>}
              </div>
            ))}
          </div>
        </div>
      )}

      {exhausted.length > 0 && (
        <div className="mb-8">
          <h3 className="font-display text-xl text-brand mb-3 flex items-center gap-2"><XCircle className="h-5 w-5 text-danger" /> Limit reached</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {exhausted.map((c) => (
              <div key={c.id} className="paper-card p-5 opacity-70 bg-danger-surface/40">
                <div className="flex items-start justify-between mb-2">
                  <div><h4 className="font-display text-lg text-brand">{c.label}</h4><p className="text-xs font-mono text-muted">{c.code}</p></div>
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-danger-surface text-danger"><XCircle className="h-3 w-3" /> Limit reached</span>
                </div>
                <p className="text-sm text-brand/80">This coupon has reached its global usage limit.</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

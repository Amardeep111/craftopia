'use client'

import { useState } from 'react'
import { Home, Briefcase, MapPin, Pencil, Trash2, Star, Check, AlertTriangle } from 'lucide-react'
import { cn } from '@/lib/cn'
import { ADDRESS_TYPES } from '@/lib/address'

function TypeIcon({ type, className = 'h-4 w-4' }) {
  if (type === 'work') return <Briefcase className={className} aria-hidden="true" />
  if (type === 'other') return <MapPin className={className} aria-hidden="true" />
  return <Home className={className} aria-hidden="true" />
}

function typeLabel(type) {
  return ADDRESS_TYPES.find((t) => t.id === type)?.label || 'Home'
}

export default function AddressCard({
  address,
  selected,
  onSelect,
  onEdit,
  onDelete,
  onMakeDefault,
}) {
  const [confirmDelete, setConfirmDelete] = useState(false)

  return (
    <article
      className={cn(
        'group relative rounded-2xl border-2 bg-ivory/40 p-5 transition-all hover:shadow-soft',
        selected
          ? 'border-bloom ring-1 ring-bloom/20 shadow-soft'
          : 'border-sand hover:border-blush/60'
      )}
    >
      {/* Radio select (whole card clickable) */}
      <button
        type="button"
        onClick={() => onSelect(address.id)}
        className="absolute inset-0 z-0 cursor-pointer rounded-2xl focus:outline-none focus:ring-2 focus:ring-bloom/40"
        aria-label={`Select address for ${address.fullName}`}
        aria-pressed={selected}
      />

      <div className="relative z-10 pointer-events-none">
        {/* Top row: type + radio + default badge */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <span
              className={cn(
                'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider',
                selected ? 'bg-bloom text-cream' : 'bg-blush/60 text-plum'
              )}
            >
              <TypeIcon type={address.addressType} className="h-3.5 w-3.5" />
              {typeLabel(address.addressType)}
            </span>
            {address.isDefault && (
              <span className="inline-flex items-center gap-1 rounded-full bg-sage/20 px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-sage">
                <Star className="h-3 w-3 fill-sage" aria-hidden="true" />
                Default
              </span>
            )}
          </div>

          {/* Radio indicator (top right) */}
          <div
            className={cn(
              'flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 transition',
              selected
                ? 'border-bloom bg-bloom text-cream'
                : 'border-sand bg-cream'
            )}
            aria-hidden="true"
          >
            {selected && <Check className="h-3 w-3" />}
          </div>
        </div>

        {/* Body */}
        <div className="mt-3">
          <h3 className="font-display text-lg text-plum">{address.fullName}</h3>
          <p className="mt-1 text-sm text-muted leading-relaxed">
            {address.houseFlatBuilding}
            {address.areaStreet ? `, ${address.areaStreet}` : ''}
            {address.landmark ? `, ${address.landmark}` : ''}
          </p>
          <p className="text-sm text-muted">
            {address.city}, {address.state} — <span className="tabular-nums">{address.pinCode}</span>
          </p>
          <p className="mt-1 text-sm text-muted tabular-nums">📞 +91 {address.mobileNumber}</p>
        </div>
      </div>

      {/* Actions (above the absolute click overlay so they remain clickable) */}
      <div className="relative z-20 mt-4 flex flex-wrap items-center gap-2 border-t border-sand/60 pt-3 pointer-events-auto">
        {!address.isDefault && (
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onMakeDefault?.(address.id) }}
            className="inline-flex items-center gap-1.5 rounded-full bg-cream px-3 py-1.5 text-xs font-semibold text-plum ring-1 ring-sand transition hover:ring-bloom/40 hover:text-bloom"
          >
            <Star className="h-3.5 w-3.5" aria-hidden="true" />
            Make default
          </button>
        )}
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onEdit?.(address) }}
          className="inline-flex items-center gap-1.5 rounded-full bg-cream px-3 py-1.5 text-xs font-semibold text-plum ring-1 ring-sand transition hover:ring-bloom/40 hover:text-bloom"
        >
          <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
          Edit
        </button>
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); setConfirmDelete(true) }}
          className="inline-flex items-center gap-1.5 rounded-full bg-cream px-3 py-1.5 text-xs font-semibold text-bloom ring-1 ring-sand transition hover:ring-bloom/40"
        >
          <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
          Remove
        </button>
      </div>

      {/* Delete confirmation popover */}
      {confirmDelete && (
        <div
          className="absolute inset-0 z-30 flex items-center justify-center rounded-2xl bg-ink/30 backdrop-blur-sm p-4"
          role="alertdialog"
          aria-label="Confirm delete address"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="w-full max-w-sm rounded-2xl bg-cream p-5 shadow-lift">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-bloom/15 text-bloom">
                <AlertTriangle className="h-5 w-5" aria-hidden="true" />
              </div>
              <div className="min-w-0">
                <h4 className="font-display text-lg text-plum">Remove this address?</h4>
                <p className="mt-1 text-sm text-muted">
                  This will delete the {typeLabel(address.addressType).toLowerCase()} address for {address.fullName}. You can re-add it later.
                </p>
              </div>
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setConfirmDelete(false)}
                className="rounded-full px-4 py-2 text-sm font-semibold text-muted hover:text-plum transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => { setConfirmDelete(false); onDelete?.(address.id) }}
                className="rounded-full bg-bloom px-4 py-2 text-sm font-semibold text-cream hover:bg-plum transition"
              >
                Yes, remove
              </button>
            </div>
          </div>
        </div>
      )}
    </article>
  )
}

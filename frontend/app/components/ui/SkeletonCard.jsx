import { cn } from '@/lib/cn'

/**
 * Lightweight brand skeleton for product cards.
 * Uses a single small inline SVG motif (a yarn ball) instead of the full
 * CraftIllustration component, so it renders instantly with no per-visual
 * overhead while still reading as "brand" rather than a generic gray block.
 */
function BrandMotif() {
  return (
    <svg viewBox="0 0 120 120" aria-hidden="true" className="h-20 w-20 opacity-70">
      <circle cx="60" cy="60" r="44" fill="none" stroke="currentColor" className="text-blush/60" strokeWidth="3" />
      <circle cx="60" cy="60" r="30" fill="none" stroke="currentColor" className="text-bloom/50" strokeWidth="3" />
      <circle cx="60" cy="60" r="16" fill="none" stroke="currentColor" className="text-plum/40" strokeWidth="3" />
      <path
        d="M20 78c22 14 44 14 66 0M26 92c20 10 40 10 60 0"
        fill="none"
        stroke="currentColor"
        className="text-plum/30"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
    </svg>
  )
}

export default function SkeletonCard({ className }) {
  return (
    <div className={cn('paper-card rounded-3xl border border-sand/80 bg-ivory/80 shadow-soft overflow-hidden', className)}>
      <div className="relative block aspect-[4/5] overflow-hidden bg-gradient-to-br from-sand/40 to-blush/30 animate-pulse">
        <div className="absolute inset-0 flex items-center justify-center">
          <BrandMotif />
        </div>
        <div className="absolute left-3 top-3 h-6 w-16 rounded-full bg-ivory/70" />
      </div>
      <div className="flex flex-1 flex-col p-5 gap-2">
        <div className="h-3 w-24 rounded-full bg-sand/60 animate-pulse" />
        <div className="h-7 w-3/4 rounded bg-sand/50 animate-pulse" />
        <div className="h-4 w-full rounded bg-sand/40 animate-pulse" />
        <div className="h-4 w-2/3 rounded bg-sand/40 animate-pulse" />
        <div className="mt-3 flex items-center justify-between">
          <div className="h-5 w-16 rounded bg-sand/50 animate-pulse" />
          <div className="h-4 w-20 rounded bg-sand/40 animate-pulse" />
        </div>
      </div>
    </div>
  )
}
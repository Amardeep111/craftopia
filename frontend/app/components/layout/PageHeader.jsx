import { cn } from '@/lib/cn'

export default function PageHeader({ eyebrow, title, description, className }) {
  return (
    <header className={cn('relative overflow-hidden pb-10 pt-8 sm:pb-14 sm:pt-12', className)}>
      <div className="pointer-events-none absolute -right-10 top-0 h-40 w-40 rounded-full bg-lavender/40 blur-3xl" />
      <div className="container-page relative">
        {eyebrow ? (
          <p className="mb-3 text-xs font-semibold uppercase tracking-[0.22em] text-bloom">{eyebrow}</p>
        ) : null}
        <h1 className="heading-display max-w-3xl text-4xl leading-tight sm:text-5xl md:text-6xl">{title}</h1>
        {description ? (
          <p className="mt-4 max-w-2xl text-lg leading-relaxed text-muted">{description}</p>
        ) : null}
      </div>
    </header>
  )
}
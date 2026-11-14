import { cn } from '@/lib/cn'

export default function PageHeader({ eyebrow, title, description, className }) {
  return (
    <header className={cn('relative overflow-hidden pb-10 pt-10 sm:pb-12 sm:pt-16', className)}>
      <div className="container-page relative">
        {eyebrow ? (
          <p className="mb-3 text-xs font-semibold uppercase tracking-[0.22em] text-accent">{eyebrow}</p>
        ) : null}
        <h1 className="heading-display font-semibold max-w-3xl text-4xl leading-tight sm:text-5xl md:text-6xl">{title}</h1>
        {description ? (
          <div className="mt-4 max-w-2xl text-lg leading-relaxed text-muted">{description}</div>
        ) : null}
      </div>
    </header>
  )
}

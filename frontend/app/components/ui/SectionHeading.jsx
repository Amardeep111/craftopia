import { cn } from '@/lib/cn'

export default function SectionHeading({
  eyebrow,
  title,
  description,
  align = 'left',
  className,
}) {
  return (
    <div
      className={cn(
        'max-w-2xl',
        align === 'center' && 'mx-auto text-center',
        className,
      )}
    >
      {eyebrow ? (
        <p className="mb-3 text-xs font-semibold uppercase tracking-[0.22em] text-accent">
          {eyebrow}
        </p>
      ) : null}
      <h2 className="heading-display font-semibold text-3xl leading-tight sm:text-4xl md:text-4xl">{title}</h2>
      {description ? (
        <div className="mt-4 text-base leading-relaxed text-muted">{description}</div>
      ) : null}
    </div>
  )
}

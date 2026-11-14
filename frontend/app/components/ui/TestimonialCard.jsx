import { Star } from 'lucide-react'
import { cn } from '@/lib/cn'

export default function TestimonialCard({ testimonial, className }) {
  return (
    <figure className={cn('relative h-full border-t border-sand pt-6', className)}>
      <blockquote className="font-display text-lg leading-relaxed text-brand">
        "{testimonial.quote}"
      </blockquote>
      <figcaption className="mt-6 flex items-center justify-between gap-3">
        <div>
          <p className="font-semibold text-brand">{testimonial.name}</p>
          <p className="text-sm text-muted">{testimonial.place}</p>
        </div>
        <div className="flex gap-0.5" role="img" aria-label={`${testimonial.rating} out of 5 stars`}>
          {Array.from({ length: testimonial.rating }).map((_, i) => (
            <Star key={i} className="h-4 w-4 fill-accent text-accent" />
          ))}
        </div>
      </figcaption>
    </figure>
  )
}
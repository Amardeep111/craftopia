import { Quote, Star } from 'lucide-react'
import { cn } from '@/lib/cn'

export default function TestimonialCard({ testimonial, className }) {
  return (
    <figure className={cn('paper-card relative h-full p-6 sm:p-8', className)}>
      <Quote className="h-8 w-8 text-petal" aria-hidden="true" />
      <blockquote className="mt-4 font-display text-xl leading-relaxed text-plum sm:text-2xl">
        "{testimonial.quote}"
      </blockquote>
      <figcaption className="mt-6 flex items-center justify-between gap-3">
        <div>
          <p className="font-semibold text-plum">{testimonial.name}</p>
          <p className="text-sm text-muted">{testimonial.place}</p>
        </div>
        <div className="flex gap-0.5" aria-label={`${testimonial.rating} out of 5 stars`}>
          {Array.from({ length: testimonial.rating }).map((_, i) => (
            <Star key={i} className="h-4 w-4 fill-bloom text-bloom" />
          ))}
        </div>
      </figcaption>
    </figure>
  )
}
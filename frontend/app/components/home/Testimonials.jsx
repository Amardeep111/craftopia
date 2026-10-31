import { testimonials } from '@/data/testimonials'
import ScrollReveal from '../ui/ScrollReveal'
import SectionHeading from '../ui/SectionHeading'
import TestimonialCard from '../ui/TestimonialCard'

export default function Testimonials() {
  return (
    <section className="container-page mt-20 sm:mt-28">
      <SectionHeading
        eyebrow="Kind words"
        title="What people are saying"
        description="A few notes from people who have welcomed our handmade pieces into their homes."
      />
      <div className="mt-10 grid gap-6 md:grid-cols-3">
        {testimonials.map((testimonial, i) => (
          <ScrollReveal key={testimonial.id} delay={i * 0.07}>
            <TestimonialCard testimonial={testimonial} />
          </ScrollReveal>
        ))}
      </div>
    </section>
  )
}
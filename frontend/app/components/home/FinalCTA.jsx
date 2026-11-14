import Link from 'next/link'
import Button from '../ui/Button'

export default function FinalCTA() {
  return (
    <section className="container-page studio-section pb-8">
      <div className="border-y border-sand px-4 py-14 text-center sm:py-16">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-accent">Ready to start?</p>
        <h2 className="heading-display font-semibold mx-auto mt-3 max-w-2xl text-3xl sm:text-5xl">
          Let's create something beautiful together.
        </h2>
        <p className="mx-auto mt-4 max-w-lg text-lg text-muted">
          Browse the collection, request a custom piece, or simply say hello. We would love to hear from you.
        </p>
        <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
          <Button as={Link} href="/shop" size="lg">
            Shop Now
          </Button>
          <Button as={Link} href="/custom-orders" variant="secondary" size="lg">
            Start Custom Order
          </Button>
        </div>
      </div>
    </section>
  )
}

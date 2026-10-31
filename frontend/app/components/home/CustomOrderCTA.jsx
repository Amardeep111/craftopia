import Link from 'next/link'
import Button from '../ui/Button'
import CraftIllustration from '../ui/CraftIllustration'
import { getSiteContent } from '@/lib/site'

export default async function CustomOrderCTA() {
  const site = await getSiteContent()

  return (
    <section className="container-page mt-20 sm:mt-28">
      <div className="relative overflow-hidden rounded-[2rem] bg-gradient-to-br from-plum via-[#6a4860] to-[#4a342c] px-6 py-12 text-cream sm:px-12 sm:py-16">
        <div className="pointer-events-none absolute -right-10 -top-10 h-48 w-48 rounded-full bg-petal/30 blur-2xl" />
        <div className="pointer-events-none absolute -bottom-16 left-10 h-40 w-40 rounded-full bg-lavender/20 blur-2xl" />
        <div className="relative grid items-center gap-10 lg:grid-cols-2">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-petal">Made to fit your style</p>
            <h2 className="mt-3 font-display text-3xl leading-tight sm:text-5xl">
              Crochet clothes, made especially for you.
            </h2>
            <p className="mt-4 max-w-lg text-cream/80">
              From cozy cardigans to playful tops and dresses, we create handmade crochet clothing in colours, sizes, and
              styles that feel uniquely yours.
            </p>
            <Button as={Link} href="/shop?category=clothes" variant="blush" className="mt-8">
              Explore Crochet Clothes
            </Button>
          </div>
          <div className="mx-auto w-full max-w-sm overflow-hidden rounded-[1.75rem] bg-cream/10 ring-1 ring-cream/15">
            <div className="aspect-square">
              {site.images?.customOrderCta?.banner ? (
                <img
                  src={site.images.customOrderCta.banner}
                  alt="Custom crochet clothes"
                  className="h-full w-full object-cover"
                />
              ) : (
                <CraftIllustration
                  visual="yarn"
                  palette={['#E8B4B8', '#F7EFE6']}
                  className="h-full from-petal/40 to-lavender/30"
                />
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

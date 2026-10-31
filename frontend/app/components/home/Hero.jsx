import Link from 'next/link'
import { Heart } from 'lucide-react'
import Button from '../ui/Button'
import CraftIllustration from '../ui/CraftIllustration'
import { Blob, FlowerBurst } from '../ui/Decor'
import { getSiteContent } from '@/lib/site'

export default async function Hero() {
  const site = await getSiteContent()

  return (
    <section className="relative overflow-hidden pb-16 pt-6 sm:pb-20 sm:pt-10 lg:pt-16">
      <Blob className="pointer-events-none absolute -left-24 top-10 h-64 w-64 text-blush/50 animate-float-slow" />
      <Blob className="pointer-events-none absolute -right-16 bottom-0 h-72 w-72 text-lavender/40 animate-drift" />
      <FlowerBurst className="pointer-events-none absolute right-[18%] top-8 hidden h-10 w-10 text-petal animate-float sm:block" />
      <FlowerBurst className="pointer-events-none absolute bottom-16 left-[12%] hidden h-8 w-8 text-sage animate-float-slow md:block" />

      <div className="container-page grid items-center gap-12 lg:grid-cols-2 lg:gap-8 lg:pt-8">
        <div className="lg:py-12">
          <p className="inline-flex items-center gap-2 rounded-full bg-ivory/90 px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.18em] text-bloom ring-1 ring-blush/70">
            <Heart className="h-3.5 w-3.5" aria-hidden="true" />
            Siliguri · Handmade
          </p>
          <h1 className="heading-display mt-5 text-4xl leading-[1.12] sm:text-5xl lg:text-6xl">
            {site.tagline || 'Handmade with love, created especially for you.'}
          </h1>
          <p className="mt-5 max-w-xl text-lg leading-relaxed text-muted">
            Welcome to {site.name || "Jamae's Craftopia"} — a cozy little world of crochet teddies, everlasting flowers,
            and custom gifts, stitched slowly by two sisters.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Button as={Link} href="/shop" size="lg">
              Explore Our Collection
            </Button>
            <Button as={Link} href="/custom-orders" variant="secondary" size="lg">
              Create Something Custom
            </Button>
          </div>
        </div>

        <div className="relative mx-auto w-full max-w-lg">
          <div className="absolute -inset-6 rounded-[2.5rem] bg-gradient-to-br from-blush/50 via-lavender/30 to-peach/40 blur-2xl" />
          <div className="relative grid grid-cols-2 gap-4">
            <div className="paper-card col-span-2 aspect-[16/10] overflow-hidden sm:aspect-[16/9]">
              {site.images?.hero?.top ? (
                <img src={site.images.hero.top} alt="Handmade crochet creations" className="h-full w-full object-cover" />
              ) : (
                <CraftIllustration visual="teddy" palette={['#E8C9A8', '#F3D5D0', '#4A342C']} className="h-full" />
              )}
            </div>
            <div className="paper-card aspect-square overflow-hidden">
              {site.images?.hero?.bottomLeft ? (
                <img src={site.images.hero.bottomLeft} alt="Handcrafted bouquet" className="h-full w-full object-cover" />
              ) : (
                <CraftIllustration visual="bouquet" palette={['#F3C9B8', '#E8B4B8', '#F7EFE6']} className="h-full" />
              )}
            </div>
            <div className="paper-card aspect-square overflow-hidden">
              {site.images?.hero?.bottomRight ? (
                <img src={site.images.hero.bottomRight} alt="Crochet floral detail" className="h-full w-full object-cover" />
              ) : (
                <CraftIllustration visual="flower" palette={['#D9CDE8', '#B89BC9']} className="h-full" />
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

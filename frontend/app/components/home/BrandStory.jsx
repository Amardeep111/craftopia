import Link from 'next/link'
import CraftIllustration from '../ui/CraftIllustration'
import ScrollReveal from '../ui/ScrollReveal'
import SectionHeading from '../ui/SectionHeading'
import Button from '../ui/Button'
import { getSiteContent } from '@/lib/site'

export default async function BrandStory() {
  const site = await getSiteContent()

  return (
    <section className="container-page mt-20 sm:mt-28">
      <div className="grid items-center gap-10 lg:grid-cols-2 lg:gap-16">
        <ScrollReveal>
          <div className="grid grid-cols-2 gap-4">
            <div className="paper-card aspect-[3/4] overflow-hidden">
              {site.images?.brandStory?.left ? (
                <img src={site.images.brandStory.left} alt="Making crochet pieces by hand" className="h-full w-full object-cover" />
              ) : (
                <CraftIllustration visual="yarn" palette={['#D9CDE8', '#5A3D4A']} className="h-full" />
              )}
            </div>
            <div className="mt-8 space-y-4">
              <div className="paper-card aspect-square overflow-hidden">
                {site.images?.brandStory?.topRight ? (
                  <img src={site.images.brandStory.topRight} alt="Handmade with heart" className="h-full w-full object-cover" />
                ) : (
                  <CraftIllustration visual="heart" palette={['#E8B4B8']} className="h-full" />
                )}
              </div>
              <div className="paper-card aspect-[4/3] overflow-hidden">
                {site.images?.brandStory?.bottomRight ? (
                  <img src={site.images.brandStory.bottomRight} alt="Detailed crochet craft" className="h-full w-full object-cover" />
                ) : (
                  <CraftIllustration visual="teddy" palette={['#F7EFE6', '#E8B4B8', '#4A342C']} className="h-full" />
                )}
              </div>
            </div>
          </div>
        </ScrollReveal>
        <ScrollReveal delay={0.1}>
          <SectionHeading
            align="left"
            eyebrow="Why Jamae's Craftopia"
            title="Made slowly, lovingly, and especially for you."
            description="This is not a factory floor. It is a home-grown craft practice — two sisters in Siliguri choosing yarn, colour, and tiny details until a piece feels right."
          />
          <ul className="mt-6 space-y-3 text-muted">
            <li className="rounded-2xl bg-ivory/80 px-4 py-3">Every creation is handmade, start to finish.</li>
            <li className="rounded-2xl bg-ivory/80 px-4 py-3">Small details — bows, initials, petal colours — get real attention.</li>
            <li className="rounded-2xl bg-ivory/80 px-4 py-3">Customization is welcome. Tell us the story, we will listen.</li>
            <li className="rounded-2xl bg-ivory/80 px-4 py-3">When you order, you are supporting a small, home-grown business.</li>
          </ul>
          <Button as={Link} href="/about" prefetch={true} variant="secondary" className="mt-6">
            Read our story
          </Button>
        </ScrollReveal>
      </div>
    </section>
  )
}

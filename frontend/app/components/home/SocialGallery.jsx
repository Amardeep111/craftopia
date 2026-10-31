import { galleryItems as defaultGalleryItems } from '@/data/testimonials'
import CraftIllustration from '../ui/CraftIllustration'
import ScrollReveal from '../ui/ScrollReveal'
import SectionHeading from '../ui/SectionHeading'
import { getSiteContent } from '@/lib/site'

export default async function SocialGallery() {
  const site = await getSiteContent()

  const configuredGallery = Array.isArray(site.images?.craftTable) && site.images.craftTable.length > 0
    ? site.images.craftTable
    : defaultGalleryItems

  return (
    <section className="container-page mt-20 sm:mt-28">
      <SectionHeading
        eyebrow="Behind the scenes"
        title="From the craft table"
        description="Little glimpses of works in progress, wrapped gifts, and quiet making moments."
      />
      <div className="mt-10 grid grid-cols-2 gap-4 md:grid-cols-4">
        {configuredGallery.slice(0, 8).map((item, i) => (
          <ScrollReveal key={item.id || i} delay={i * 0.04}>
            <div
              className={`paper-card overflow-hidden ${item.tall ? 'md:row-span-2' : ''}`}
            >
              <div className={item.tall ? 'aspect-[4/5]' : 'aspect-square'}>
                {item.image ? (
                  <img
                    src={item.image}
                    alt="From the craft table"
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <CraftIllustration visual={item.visual || 'yarn'} className="h-full w-full" />
                )}
              </div>
            </div>
          </ScrollReveal>
        ))}
      </div>
    </section>
  )
}

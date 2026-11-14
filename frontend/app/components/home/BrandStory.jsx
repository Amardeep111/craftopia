import Link from 'next/link'
import ProductImage from '../ui/ProductImage'
import ScrollReveal from '../ui/ScrollReveal'
import SectionHeading from '../ui/SectionHeading'
import Button from '../ui/Button'
import { getSiteContent } from '@/lib/site'

export default async function BrandStory({ products = [] }) {
  const site = await getSiteContent()

  return (
    <section className="container-page studio-section">
      <div className="grid items-center gap-10 lg:grid-cols-2 lg:gap-16">
        <ScrollReveal>
          <div className="grid grid-cols-2 items-start gap-4">
            {['left', 'topRight', 'bottomRight'].map((slot, index) => {
              const product = products[[4, 6, 7][index]] || products[index]
              const configured = site.images?.brandStory?.[slot]
              const photo = configured || product?.imageUrl || product?.image || product?.images?.[0]
              return <div key={slot} className={index === 0 ? 'relative row-span-2 aspect-[3/4] overflow-hidden rounded' : `relative aspect-square overflow-hidden rounded ${index === 1 ? 'mt-8' : ''}`}>
                <ProductImage src={photo} alt={configured ? 'From the Jamae’s Craftopia studio' : product?.name || 'Handmade crochet details'} visual={product?.visual || 'yarn'} fit="cover" sizes="(max-width: 1023px) 50vw, 260px" className="h-full w-full" />
              </div>
            })}
          </div>
        </ScrollReveal>
        <ScrollReveal delay={0.1}>
          <SectionHeading
            align="left"
            title="Made slowly, lovingly, and especially for you."
            description="Two sisters in Siliguri, choosing yarn, colour, and tiny details until a piece feels right. Every order supports our small family studio."
          />
          <ul className="mt-6 space-y-3 text-muted">
            <li className="border-b border-sand pb-3">Every creation is handmade, start to finish.</li>
            <li className="border-b border-sand pb-3">Small details — bows, initials, petal colours — get real attention.</li>
            <li className="border-b border-sand pb-3">Customization is welcome. Tell us the story, we will listen.</li>
            <li className="border-b border-sand pb-3">When you order, you are supporting a small, home-grown business.</li>
          </ul>
          <Button as={Link} href="/about" prefetch={true} variant="secondary" className="mt-6">
            Read our story
          </Button>
        </ScrollReveal>
      </div>
    </section>
  )
}

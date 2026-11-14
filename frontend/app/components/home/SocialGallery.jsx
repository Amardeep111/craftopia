import { galleryItems as defaultGalleryItems } from '@/data/testimonials'
import ProductImage from '../ui/ProductImage'
import Link from 'next/link'
import ScrollReveal from '../ui/ScrollReveal'
import SectionHeading from '../ui/SectionHeading'
import { getSiteContent } from '@/lib/site'

export default async function SocialGallery({ products = [] }) {
  const site = await getSiteContent()

  const configuredGallery = Array.isArray(site.images?.craftTable) && site.images.craftTable.length > 0
    ? site.images.craftTable
    : defaultGalleryItems

  const hasStudioPhotos = configuredGallery.some((item) => item.image)
  const gallery = hasStudioPhotos || !products.length ? configuredGallery : products.map((product) => ({ id: product.id, image: product.imageUrl || product.image || product.images?.[0], name: product.name, visual: product.visual, productId: product.id }))

  return (
    <section className="container-page studio-section">
      <SectionHeading
        title={hasStudioPhotos ? "From the craft table" : "The little details"}
        description={hasStudioPhotos ? "Little glimpses of works in progress, wrapped gifts, and quiet making moments." : "Take a closer look at the stitches, colours, and finishing touches in our collection."}
      />
      <div className="mt-10 grid grid-cols-2 gap-4 md:grid-cols-4">
        {gallery.slice(0, 8).map((item, i) => (
          <ScrollReveal key={item.id || i} delay={i * 0.04}>
            {item.productId ? <Link href={`/shop/${item.productId}`} className="studio-detail-photo" aria-label={`View ${item.name}`}>
              <ProductImage src={item.image} alt={item.name} visual={item.visual} fit="cover" sizes="(max-width: 767px) 50vw, 25vw" className="aspect-square w-full" />
            </Link> : <div className="studio-detail-photo"><ProductImage src={item.image} alt="From the craft table" visual={item.visual || 'yarn'} fit="cover" sizes="(max-width: 767px) 50vw, 25vw" className="aspect-square w-full" /></div>}
          </ScrollReveal>
        ))}
      </div>
    </section>
  )
}

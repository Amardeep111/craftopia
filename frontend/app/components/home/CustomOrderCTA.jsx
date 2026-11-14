import Link from 'next/link'
import Button from '../ui/Button'
import ProductImage from '../ui/ProductImage'
import { getSiteContent } from '@/lib/site'

export default async function CustomOrderCTA({ products = [] }) {
  const site = await getSiteContent()
  const clothing = products.find((product) => /cloth|outfit|top|scarf|cardigan/i.test(`${product.categoryName || ''} ${product.name || ''}`))
  const photo = site.images?.customOrderCta?.banner || clothing?.imageUrl || clothing?.image

  return (
    <section className="container-page studio-section">
      <div className="studio-banner relative overflow-hidden">
        <div className="relative grid items-center gap-10 lg:grid-cols-2">
          <div>
            <p className="text-sm font-medium text-on-primary">Made to fit your style</p>
            <h2 className="mt-3 font-display font-semibold text-3xl leading-tight sm:text-5xl">
              Crochet clothes, made especially for you.
            </h2>
            <p className="mt-4 max-w-lg text-on-primary/80">
              From cozy cardigans to playful tops and dresses, we create handmade crochet clothing in colours, sizes, and
              styles that feel uniquely yours.
            </p>
            <Button as={Link} href="/shop?category=clothes" variant="blush" className="mt-8">
              Explore Crochet Clothes
            </Button>
          </div>
          <div className="mx-auto w-full max-w-sm overflow-hidden rounded bg-ivory">
            <div className="aspect-square">
              <ProductImage src={photo} alt={clothing?.name || 'Custom crochet clothing'} visual="yarn" fit="cover" sizes="(max-width: 1023px) 90vw, 384px" className="h-full w-full" />
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

import { Suspense } from 'react'
import Link from 'next/link'
import Image from '../ui/StorefrontImage'
import { ArrowUpRight } from 'lucide-react'
import Button from '../ui/Button'
import CraftIllustration from '../ui/CraftIllustration'
import { getSiteContent } from '@/lib/site'
import MarkdownContent from '@/components/content/MarkdownContent'

export default async function Hero({ products = [], productsPromise }) {
  const site = await getSiteContent()
  return <HeroContent site={site} products={products} productsPromise={productsPromise} />
}

export function HeroContent({ site, products = [], productsPromise }) {
  return (
    <section className="studio-hero">
      <div className="container-page studio-hero-grid">
        <div>
          <p className="studio-eyebrow">A little studio in Siliguri, India</p>
          <h1 className="studio-title mt-6 max-w-xl"><MarkdownContent inline>{site.tagline || 'Handmade with love, created especially for you.'}</MarkdownContent></h1>
          <p className="mt-6 max-w-md text-base leading-relaxed text-muted">Crochet companions, flowers that stay, and gifts with a story. Made slowly by two sisters at {site.name || "Jamae's Craftopia"}.</p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Button as={Link} href="/shop" size="lg">Explore the collection <ArrowUpRight className="h-4 w-4" aria-hidden="true" /></Button>
            <Button as={Link} href="/custom-orders" variant="secondary" size="lg">Make it personal</Button>
          </div>
          <div className="mt-7 flex flex-wrap items-center gap-x-5 gap-y-3 text-xs text-muted" aria-label="Popular collections"><span>Find your little joy</span><Link className="studio-text-link" href="/shop?category=flowers">Flowers</Link><Link className="studio-text-link" href="/shop?category=crochet-toys">Crochet toys</Link><Link className="studio-text-link" href="/shop?category=keychains">Keychains</Link></div>
        </div>
        {productsPromise ? <Suspense fallback={<HeroImages site={site} products={[]} />}><LoadedHeroImages site={site} productsPromise={productsPromise} /></Suspense> : <HeroImages site={site} products={products} />}
      </div>
    </section>
  )
}

async function LoadedHeroImages({ site, productsPromise }) {
  return <HeroImages site={site} products={await productsPromise} />
}

function HeroImages({ site, products }) {
  const available = products.filter((product) => product.availableForSale !== false && product.stock > 0)
  const picks = [available[0], available.find((p) => p.id !== available[0]?.id && p.visual !== available[0]?.visual) || available[1], available.find((p) => p.visual === 'teddy' || p.visual === 'bunny') || available[2]]
  const slots = ['top', 'bottomLeft', 'bottomRight']
  const fallbackVisuals = ['bouquet', 'flower', 'teddy']
  return (
        <div className="studio-visual">
          {slots.map((slot, index) => {
            const product = picks[index]
            const configuredImage = site.images?.hero?.[slot]
            const image = configuredImage || product?.imageUrl || product?.image || (Array.isArray(product?.images) ? product.images[0] : null)
            const label = configuredImage ? ['Handmade crochet creations', 'Handcrafted bouquet', 'Crochet floral detail'][index] : product?.name || 'Handmade crochet creations'
            return <Link key={slot} href={product && !configuredImage ? `/shop/${product.id}` : '/shop'} className={index === 0 ? 'studio-visual-main studio-image-link' : 'studio-visual-small studio-image-link'}>
              {image ? <Image src={image} alt={label} fill sizes={index === 0 ? '(max-width: 1023px) 55vw, 300px' : '(max-width: 1023px) 40vw, 220px'} priority={index === 0} className="object-cover" /> : <CraftIllustration visual={fallbackVisuals[index]} palette={['var(--art-primary)', 'var(--art-secondary)', 'var(--art-ink)']} className="h-full" />}
              <span className="studio-image-cta">{index === 0 ? 'Discover handmade' : index === 1 ? 'Find a little joy' : 'Meet your favourite'} <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" /></span>
            </Link>
          })}
          <div className="studio-caption"><span>From our hands to yours</span><span>Jamae’s Craftopia</span></div>
        </div>
  )
}

import BrandHighlights from './components/home/BrandHighlights'
import BrandStory from './components/home/BrandStory'
import Categories from './components/home/Categories'
import CustomOrderCTA from './components/home/CustomOrderCTA'
import FeaturedProducts from './components/home/FeaturedProducts'
import FinalCTA from './components/home/FinalCTA'
import Hero, { HeroContent } from './components/home/Hero'
import { Suspense } from 'react'
import defaultSite from './data/site-content.json'
import CompletedHomeView from './components/home/CompletedHomeView'
import { getSiteContent } from './lib/site'
import HowItWorks from './components/home/HowItWorks'
import SocialGallery from './components/home/SocialGallery'
import Testimonials from './components/home/Testimonials'

export const dynamic = 'force-dynamic'

const BACKEND_URL = (process.env.GO_BACKEND_URL || process.env.NEXT_PUBLIC_API_URL || (process.env.NODE_ENV === 'production' ? 'https://craftopia-backend.vercel.app' : 'http://localhost:8080')).replace(/\/$/, '')

async function getFeaturedProducts() {
  try {
    const res = await fetch(`${BACKEND_URL}/api/products?featured=true&limit=8`, { cache: 'no-store' })
    if (!res.ok) return []
    const json = await res.json()
    return Array.isArray(json?.data) ? json.data : []
  } catch (err) {
    console.error('SSR: Error pre-fetching featured products:', err)
    return []
  }
}

async function getCategories() {
  try {
    const res = await fetch(`${BACKEND_URL}/api/categories`, { cache: 'no-store' })
    if (!res.ok) return []
    const json = await res.json()
    return Array.isArray(json?.data) ? json.data : []
  } catch (err) {
    console.error('SSR: Error pre-fetching categories:', err)
    return []
  }
}

async function FreshHomeContent({ productsPromise, categoriesPromise }) {
  const [products, categories] = await Promise.all([productsPromise, categoriesPromise, getSiteContent()])
  return <>
    <Hero products={products} />
    <BrandHighlights />
    <FeaturedProducts initialProducts={products} />
    <Categories initialCategories={categories} />
    <BrandStory products={products} />
    <CustomOrderCTA products={products} />
    <HowItWorks />
    <SocialGallery products={products} />
    <Testimonials />
    <FinalCTA />
  </>
}

export default function Home() {
  // The client view can reuse the completed public page while these original
  // no-store reads prepare its replacement. No authenticated view is retained.
  const productsPromise = getFeaturedProducts()
  const categoriesPromise = getCategories()
  return <CompletedHomeView>
    <Suspense fallback={<HomeOpeningView />}>
      <FreshHomeContent productsPromise={productsPromise} categoriesPromise={categoriesPromise} />
    </Suspense>
  </CompletedHomeView>
}

function HomeOpeningView() {
  return <>
    <HeroContent site={defaultSite} />
    <BrandHighlights />
    <section className="container-page studio-section" role="status" aria-live="polite">
      <p className="text-sm text-muted">Loading the latest creations…</p>
    </section>
  </>
}

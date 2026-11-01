import BrandHighlights from './components/home/BrandHighlights'
import BrandStory from './components/home/BrandStory'
import Categories from './components/home/Categories'
import CustomOrderCTA from './components/home/CustomOrderCTA'
import FeaturedProducts from './components/home/FeaturedProducts'
import FinalCTA from './components/home/FinalCTA'
import Hero from './components/home/Hero'
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

export default async function Home() {
  const [featuredProducts, categories] = await Promise.all([
    getFeaturedProducts(),
    getCategories(),
  ])

  return (
    <>
      <Hero />
      <BrandHighlights />
      <Categories initialCategories={categories} />
      <FeaturedProducts initialProducts={featuredProducts} />
      <BrandStory />
      <CustomOrderCTA />
      <HowItWorks />
      <SocialGallery />
      <Testimonials />
      <FinalCTA />
    </>
  )
}

export const revalidate = 3600 // Revalidate sitemap hourly

export default async function sitemap() {
  const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || 'https://craftopia-store.vercel.app').replace(/\/$/, '')
  const backendUrl = (
    process.env.GO_BACKEND_URL ||
    process.env.NEXT_PUBLIC_API_URL ||
    (process.env.NODE_ENV === 'production' ? 'https://craftopia-backend.vercel.app' : 'http://localhost:8080')
  ).replace(/\/$/, '')

  const staticRoutes = [
    { url: siteUrl, lastModified: new Date(), changeFrequency: 'daily', priority: 1.0 },
    { url: `${siteUrl}/shop`, lastModified: new Date(), changeFrequency: 'daily', priority: 0.9 },
    { url: `${siteUrl}/about`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.7 },
    { url: `${siteUrl}/contact`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.6 },
    { url: `${siteUrl}/custom-orders`, lastModified: new Date(), changeFrequency: 'weekly', priority: 0.8 },
    { url: `${siteUrl}/coupons`, lastModified: new Date(), changeFrequency: 'weekly', priority: 0.7 },
  ]

  let productRoutes = []
  try {
    const res = await fetch(`${backendUrl}/api/products?limit=100`, { next: { revalidate: 3600 } })
    if (res.ok) {
      const data = await res.json()
      const products = Array.isArray(data?.data) ? data.data : []
      productRoutes = products
        .filter((p) => p.published !== false)
        .map((p) => ({
          url: `${siteUrl}/shop/${encodeURIComponent(p.slug || p.id)}`,
          lastModified: p.updatedAt ? new Date(p.updatedAt) : new Date(),
          changeFrequency: 'weekly',
          priority: 0.8,
        }))
    }
  } catch (e) {
    console.error('Failed to generate product sitemap entries:', e)
  }

  return [...staticRoutes, ...productRoutes]
}

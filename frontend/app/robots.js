export default function robots() {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://craftopia-store.vercel.app'
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: [
          '/admin',
          '/admin/',
          '/account',
          '/account/',
          '/checkout',
          '/checkout/',
          '/orders',
          '/orders/',
          '/api/',
        ],
      },
    ],
    sitemap: `${siteUrl.replace(/\/$/, '')}/sitemap.xml`,
  }
}

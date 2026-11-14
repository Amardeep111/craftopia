/** @type {import('next').NextConfig} */
const nextConfig = {
  // Keep review builds separate from an active development server.
  distDir: process.env.CRAFTOPIA_BUILD_DIR || '.next',
  // Deliver SEO and sharing metadata in <head> for every browser/crawler.
  // Page content can still stream independently after metadata resolves.
  htmlLimitedBots: /.*/,
  images: {
    qualities: [72, 75, 80],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
      {
        protocol: 'http',
        hostname: '**',
      },
    ],
  },
  experimental: {
    optimizePackageImports: ['lucide-react'],
  },
  // Essential HTTP security defense headers
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'X-DNS-Prefetch-Control', value: 'on' },
          { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
          { key: 'X-XSS-Protection', value: '1; mode=block' },
          { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
        ],
      },
    ]
  },
  // Automatically proxies API requests to the Go backend in local dev or unified hosting
  async rewrites() {
    const backendURL = process.env.GO_BACKEND_URL || process.env.NEXT_PUBLIC_API_URL || (process.env.NODE_ENV === 'production' ? 'https://craftopia-backend.vercel.app' : 'http://localhost:8080')
    return [
      {
        source: '/api/:path*',
        destination: `${backendURL.replace(/\/$/, '')}/api/:path*`,
      },
      {
        source: '/health/:path*',
        destination: `${backendURL.replace(/\/$/, '')}/health/:path*`,
      },
    ]
  },
}

export default nextConfig


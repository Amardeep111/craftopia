import './globals.css'
import Navbar from './components/layout/Navbar'
import Footer from './components/layout/Footer'
import ScrollToTop from './components/layout/ScrollToTop'
import PageTransition from './components/layout/PageTransition'
import ConditionalStorefrontChrome from './components/layout/ConditionalStorefrontChrome'
import CartSync from './components/cart/CartSync'
import { getServerCart, getServerUser } from './lib/auth/server'

const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || 'https://craftopia-store.vercel.app').replace(/\/$/, '')

export const metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "Jamae's Craftopia — Handmade Crochet & Custom Gifts with Love",
    template: `%s — Jamae's Craftopia`,
  },
  description: "Handmade crochet, amigurumi, bouquet flowers, and custom keepsake gifts made with love in Siliguri, India.",
  keywords: ['handmade', 'crochet', 'amigurumi', 'custom gifts', 'crochet flowers', 'Siliguri', 'India', 'Jamaes Craftopia'],
  authors: [{ name: "Jamae's Craftopia" }],
  openGraph: {
    type: 'website',
    locale: 'en_IN',
    url: siteUrl,
    siteName: "Jamae's Craftopia",
    title: "Jamae's Craftopia — Handmade Crochet & Custom Gifts with Love",
    description: "Handmade crochet, amigurumi, bouquet flowers, and custom keepsake gifts made with love in Siliguri, India.",
    images: [
      {
        url: '/favicon.svg',
        width: 512,
        height: 512,
        alt: "Jamae's Craftopia",
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: "Jamae's Craftopia — Handmade with Love",
    description: "Handmade crochet, amigurumi, bouquet flowers, and custom keepsake gifts made with love in Siliguri, India.",
  },
  icons: { icon: '/favicon.svg' },
}

export default async function RootLayout({ children }) {
  // These are independent authenticated reads; overlap their network/database latency.
  const [initialUser, initialCart] = await Promise.all([getServerUser(), getServerCart()])

  const organizationJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: "Jamae's Craftopia",
    url: siteUrl,
    description: 'Handmade crochet, amigurumi, bouquet flowers, and custom keepsake gifts made with love in Siliguri, India.',
    publisher: {
      '@type': 'Organization',
      name: "Jamae's Craftopia",
      logo: {
        '@type': 'ImageObject',
        url: `${siteUrl}/favicon.svg`,
      },
    },
  }

  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,400;0,9..144,500;0,9..144,600;0,9..144,700;1,9..144,500;1,9..144,600&family=Nunito:ital,wght@0,400;0,500;0,600;0,700;1,400&display=swap"
          rel="stylesheet"
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationJsonLd) }}
        />
      </head>
      <body>
        <CartSync initialUser={initialUser} initialCart={initialCart} />
        <div className="flex min-h-screen flex-col">
          <a
            href="#main"
            className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[60] focus:rounded-full focus:bg-plum focus:px-4 focus:py-2 focus:text-cream"
          >
            Skip to content
          </a>
          <ScrollToTop />
          <ConditionalStorefrontChrome><Navbar initialUser={initialUser} /></ConditionalStorefrontChrome>
          <main id="main" className="flex-1">
            <PageTransition>
              {children}
            </PageTransition>
          </main>
          <ConditionalStorefrontChrome><Footer /></ConditionalStorefrontChrome>
        </div>
      </body>
    </html>
  )
}

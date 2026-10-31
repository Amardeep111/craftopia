import './globals.css'
import Navbar from './components/layout/Navbar'
import Footer from './components/layout/Footer'
import ScrollToTop from './components/layout/ScrollToTop'
import PageTransition from './components/layout/PageTransition'
import ConditionalStorefrontChrome from './components/layout/ConditionalStorefrontChrome'
import CartSync from './components/cart/CartSync'

export const metadata = {
  title: {
    default: "Jamae's Craftopia — Handmade with Love",
    template: `%s — Jamae's Craftopia`,
  },
  description: "Handmade crochet, amigurumi, flowers, and custom gifts made with love in Siliguri, India.",
  keywords: ['handmade', 'crochet', 'amigurumi', 'custom gifts', 'Siliguri', 'India'],
  authors: [{ name: "Jamae's Craftopia" }],
  icons: { icon: '/favicon.svg' },
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,400;0,9..144,500;0,9..144,600;0,9..144,700;1,9..144,500;1,9..144,600&family=Nunito:ital,wght@0,400;0,500;0,600;0,700;1,400&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <CartSync />
        <div className="flex min-h-screen flex-col">
          <a
            href="#main"
            className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[60] focus:rounded-full focus:bg-plum focus:px-4 focus:py-2 focus:text-cream"
          >
            Skip to content
          </a>
          <ScrollToTop />
          <ConditionalStorefrontChrome><Navbar /></ConditionalStorefrontChrome>
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

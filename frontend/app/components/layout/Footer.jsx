import Link from 'next/link'
import { MapPin, Phone, Mail, MessageCircle } from 'lucide-react'
import { FacebookIcon, InstagramIcon } from '../ui/SocialIcons'
import { FlowerBurst } from '../ui/Decor'
import { shopCategories } from '@/data/categories'
import { getSiteContent } from '@/lib/site'

const quickLinks = [
  { to: '/shop', label: 'Shop' },
  { to: '/custom-orders', label: 'Custom Orders' },
  { to: '/about', label: 'About Us' },
  { to: '/contact', label: 'Contact' },
]

export default async function Footer() {
  const site = await getSiteContent()
  const visibility = site.visibility || {}

  const showLocation = visibility.location !== false && Boolean(site.location?.trim())
  const showEmail = visibility.email !== false && Boolean(site.email?.trim())
  const showPhone = visibility.phone !== false && Boolean(site.phone?.trim())
  const showInstagram = visibility.instagram !== false && Boolean(site.social?.instagram?.trim())
  const showFacebook = visibility.facebook !== false && Boolean(site.social?.facebook?.trim())
  const showWhatsapp = visibility.whatsapp !== false && Boolean(site.whatsapp?.trim())

  const whatsappHref = site.whatsapp?.startsWith('http')
    ? site.whatsapp
    : site.whatsapp?.replace(/\D/g, '')
      ? `https://wa.me/${site.whatsapp.replace(/\D/g, '')}`
      : 'https://wa.me/'

  return (
    <footer className="mt-20 border-t border-sand bg-ivory/70">
      <div className="container-page grid gap-10 py-14 sm:grid-cols-2 lg:grid-cols-4">
        <div className="lg:col-span-1">
          <Link href="/" className="inline-flex items-center gap-2 text-plum">
            <FlowerBurst className="h-7 w-7 text-bloom" />
            <span className="font-display text-2xl">{site.name || "Jamae's Craftopia"}</span>
          </Link>
          <p className="mt-4 max-w-xs text-sm leading-relaxed text-muted">
            {site.tagline || 'Little handmade things that bring big smiles — crocheted slowly in Siliguri, with love from two sisters.'}
          </p>
        </div>
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-[0.18em] text-plum">Visit</h2>
          <ul className="mt-4 space-y-2 text-sm text-muted">
            {quickLinks.map((link) => (
              <li key={link.to}>
                <Link href={link.to} prefetch={true} className="transition hover:text-plum">
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-[0.18em] text-plum">Shop</h2>
          <ul className="mt-4 space-y-2 text-sm text-muted">
            {shopCategories.map((cat) => (
              <li key={cat.id}>
                <Link href={`/shop?category=${cat.slug}`} className="transition hover:text-plum">
                  {cat.name}
                </Link>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-[0.18em] text-plum">Find us</h2>
          {showLocation && (
            <p className="mt-4 flex items-start gap-2 text-sm text-muted">
              <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-bloom" aria-hidden="true" />
              <span>{site.location}</span>
            </p>
          )}
          {showEmail && (
            <p className="mt-2 flex items-center gap-2 text-sm text-muted">
              <Mail className="h-4 w-4 shrink-0 text-bloom" aria-hidden="true" />
              <a href={`mailto:${site.email}`} className="hover:text-plum transition">
                {site.email}
              </a>
            </p>
          )}
          {showPhone && (
            <p className="mt-2 flex items-center gap-2 text-sm text-muted">
              <Phone className="h-4 w-4 shrink-0 text-bloom" aria-hidden="true" />
              <a href={`tel:${site.phone.replace(/[^0-9+]/g, '')}`} className="hover:text-plum transition">
                {site.phone}
              </a>
            </p>
          )}
          <div className="mt-4 flex flex-wrap items-center gap-2">
            {showInstagram && (
              <a
                href={site.social.instagram}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-full bg-cream p-2 text-plum transition hover:bg-blush"
                aria-label="Instagram"
              >
                <InstagramIcon />
              </a>
            )}
            {showFacebook && (
              <a
                href={site.social.facebook}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-full bg-cream p-2 text-plum transition hover:bg-blush"
                aria-label="Facebook"
              >
                <FacebookIcon />
              </a>
            )}
            {showWhatsapp && (
              <a
                href={whatsappHref}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-full bg-cream p-2 text-plum transition hover:bg-blush"
                aria-label="WhatsApp"
              >
                <MessageCircle className="h-4 w-4" />
              </a>
            )}
          </div>
        </div>
      </div>
      <div className="border-t border-sand py-5 text-center text-sm text-muted">
        © {new Date().getFullYear()} {site.name || "Jamae's Craftopia"}. Handmade with love.
      </div>
    </footer>
  )
}

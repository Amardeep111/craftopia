'use client'

import { notifyNavigation } from './PendingLinkIndicator'
import ThemeControl from './ThemeControl'
import HomeLink, { navigateHome } from './HomeLink'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Menu, ShoppingBag, User, X } from 'lucide-react'
import { AnimatePresence, motion } from 'framer-motion'
import { useLockBody } from '@/hooks/useScrolled'
import { cn } from '@/lib/cn'
import { useCartStore } from '@/lib/cart'
import { useUserStore } from '@/lib/user'

const links = [
  { to: '/', label: 'Home' },
  { to: '/shop', label: 'Shop' },
  { to: '/custom-orders', label: 'Custom Orders' },
  { to: '/about', label: 'About Us' },
  { to: '/contact', label: 'Contact' },
  { to: '/orders/me', label: 'My Orders' },
]

function Logo() {
  return (
    <HomeLink className="flex items-center gap-2.5 text-brand">
      <span className="leading-tight">
        <span className="block font-display text-lg sm:text-xl">Jamae's</span>
        <span className="-mt-1 block text-[0.65rem] font-semibold uppercase tracking-[0.22em] text-muted">
          Craftopia
        </span>
      </span>
    </HomeLink>
  )
}

export default function Navbar({ initialUser = null }) {
  const [open, setOpen] = useState(false)
  const pathname = usePathname()
  useLockBody(open)
  const isLoggedIn = useUserStore((state) => state.isLoggedIn)
  const customerName = useUserStore((state) => state.name)
  const userLogin = useUserStore((state) => state.login)
  const userLogout = useUserStore((state) => state.logout)

  useEffect(() => {
    if (initialUser) userLogin(initialUser)
    else userLogout()
  }, [initialUser, userLogin, userLogout])

  // Reactive cart badge — directly subscribes to the Zustand cart store,
  // which is the single source of truth shared with the cart page and
  // Add to Cart actions. Persists via zustand persist middleware (localStorage).
  const items = useCartStore((s) => s.items)
  const cartCount = items.reduce((sum, item) => sum + (Number(item?.quantity) || 0), 0)

  const isActive = (path) => {
    if (path === '/') return pathname === '/'
    return pathname?.startsWith(path)
  }

  const loginRedirectPath = (() => {
    if (!pathname || pathname === '/' || pathname.startsWith('/account')) return ''
    // Never resume directly to payment or confirmation; checkout must start at address verification
    if (pathname.startsWith('/checkout')) return '/checkout/address'
    return pathname
  })()

  const loginHref = loginRedirectPath
    ? `/account/login?redirect=${encodeURIComponent(loginRedirectPath)}`
    : '/account/login'

  return (
    <header className="sticky top-0 z-50 border-b border-sand bg-cream">
      <nav className="container-page flex h-16 items-center justify-between sm:h-[4.5rem]" aria-label="Primary">
        <Logo />
        <ul className="hidden items-center gap-1 lg:flex">
          {links.map((link) => (
            <li key={link.to}>
              <Link
                href={link.to}
                onNavigate={(event) => link.to === '/' ? navigateHome(event) : notifyNavigation(link.to)}
                prefetch="auto"
                className={cn(
                  'rounded px-3 py-2 text-sm font-semibold transition',
                  isActive(link.to) ? 'text-brand underline underline-offset-8 decoration-bloom' : 'text-muted hover:bg-ivory/80 hover:text-brand',
                )}
              >
                {link.label}
              </Link>
            </li>
          ))}
        </ul>

        {/* Right side: Account + Cart */}
        <div className="ml-auto mr-2 flex items-center gap-2 lg:ml-0 lg:mr-0">
          <Link
            href={isLoggedIn ? '/account/profile' : loginHref}
            onNavigate={() => notifyNavigation(isLoggedIn ? '/account/profile' : loginHref)}
            className="hidden items-center gap-1.5 rounded-full px-3 py-2 text-sm font-semibold text-brand transition hover:bg-ivory lg:flex"
            aria-label={isLoggedIn ? 'My profile' : 'Login'}
          >
            <User className="h-4 w-4" aria-hidden="true" />
            <span className="max-w-36 truncate">{isLoggedIn ? (customerName || 'My Profile') : 'Login'}</span>
          </Link>

          <Link
            href="/cart"
            onNavigate={() => notifyNavigation('/cart')}
            className="relative flex min-h-11 min-w-11 items-center justify-center rounded p-2 text-brand transition-colors hover:bg-ivory"
            aria-label={`Shopping cart${cartCount > 0 ? `, ${cartCount} item${cartCount !== 1 ? 's' : ''}` : ', empty'}`}
          >
            <ShoppingBag className="h-5 w-5" aria-hidden="true" />
            {cartCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-bloom px-1 text-[10px] font-bold text-on-primary">
                {cartCount > 9 ? '9+' : cartCount}
              </span>
            )}
          </Link>
        </div>

        <button
          type="button"
          className="rounded-full p-2 text-brand transition hover:bg-ivory lg:hidden"
          aria-label={open ? 'Close menu' : 'Open menu'}
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
        >
          {open ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
        <div className="ml-2"><ThemeControl /></div>
      </nav>

      <AnimatePresence>
        {open ? (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
            className="overflow-hidden border-t border-sand/70 bg-cream lg:hidden"
          >
            <div className="container-page flex flex-col gap-2 py-6">
              {links.map((link) => (
                <Link
                  key={link.to}
                  href={link.to}
                onNavigate={(event) => link.to === '/' ? navigateHome(event) : notifyNavigation(link.to)}
                  prefetch="auto"
                  onClick={() => setOpen(false)}
                  className={cn(
                    'rounded-2xl px-4 py-3 text-lg font-semibold',
                    isActive(link.to) ? 'text-brand underline underline-offset-8 decoration-bloom' : 'text-brand hover:bg-ivory/80',
                  )}
                >
                  {link.label}
                </Link>
              ))}
              <div className="mt-3 flex flex-col gap-2 border-t border-sand/60 pt-4">
                <Link
                  href={isLoggedIn ? '/account/profile' : loginHref}
            onNavigate={() => notifyNavigation(isLoggedIn ? '/account/profile' : loginHref)}
                  onClick={() => setOpen(false)}
                  className="flex items-center gap-2 rounded-2xl px-4 py-3 text-base font-semibold text-brand hover:bg-ivory/80"
                  aria-label={isLoggedIn ? 'My profile' : 'Login'}
                >
                  <User className="h-5 w-5" aria-hidden="true" />
                  <span className="max-w-52 truncate">{isLoggedIn ? (customerName || 'My Profile') : 'Login'}</span>
                </Link>
                <Link
                  href="/cart"
            onNavigate={() => notifyNavigation('/cart')}
                  onClick={() => setOpen(false)}
                  className="relative flex items-center gap-2 rounded-2xl px-4 py-3 text-base font-semibold text-brand hover:bg-ivory/80"
                  aria-label={`Shopping cart${cartCount > 0 ? `, ${cartCount} items` : ', empty'}`}
                >
                  <ShoppingBag className="h-5 w-5" aria-hidden="true" />
                  Cart
                  {cartCount > 0 && (
                    <span className="ml-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-bloom px-1.5 text-xs font-bold text-on-primary">
                      {cartCount > 9 ? '9+' : cartCount}
                    </span>
                  )}
                </Link>
              </div>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </header>
  )
}

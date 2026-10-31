'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Menu, ShoppingBag, User, X } from 'lucide-react'
import { AnimatePresence, motion } from 'framer-motion'
import { FlowerBurst } from '../ui/Decor'
import { useLockBody, useScrolled } from '@/hooks/useScrolled'
import { cn } from '@/lib/cn'
import { useCartStore } from '@/lib/cart'
import { fetchCurrentUser } from '@/lib/auth/client'
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
    <Link href="/" className="flex items-center gap-2.5 text-plum">
      <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-blush/80">
        <FlowerBurst className="h-6 w-6 text-bloom" />
      </span>
      <span className="leading-tight">
        <span className="block font-display text-lg sm:text-xl">Jamae's</span>
        <span className="-mt-1 block text-[0.65rem] font-semibold uppercase tracking-[0.22em] text-muted">
          Craftopia
        </span>
      </span>
    </Link>
  )
}

export default function Navbar() {
  const scrolled = useScrolled()
  const [open, setOpen] = useState(false)
  const pathname = usePathname()
  useLockBody(open)
  const isLoggedIn = useUserStore((state) => state.isLoggedIn)
  const customerName = useUserStore((state) => state.name)
  const userLogin = useUserStore((state) => state.login)
  const userLogout = useUserStore((state) => state.logout)

  useEffect(() => {
    let active = true
    fetchCurrentUser().then((auth) => {
      if (!active) return
      if (auth.authenticated && auth.user) userLogin(auth.user)
      else userLogout()
    }).catch(() => { if (active) userLogout() })
    return () => { active = false }
  }, [userLogin, userLogout])

  // Reactive cart badge — directly subscribes to the Zustand cart store,
  // which is the single source of truth shared with the cart page and
  // Add to Cart actions. Persists via zustand persist middleware (localStorage).
  const items = useCartStore((s) => s.items)
  const cartCount = items.reduce((sum, item) => sum + (Number(item?.quantity) || 0), 0)

  const isActive = (path) => {
    if (path === '/') return pathname === '/'
    return pathname?.startsWith(path)
  }

  return (
    <header
      className={cn(
        'sticky top-0 z-50 transition duration-300',
        scrolled || open
          ? 'border-b border-sand/70 bg-cream/90 shadow-soft backdrop-blur-md'
          : 'bg-transparent',
      )}
    >
      <nav className="container-page flex h-16 items-center justify-between sm:h-[4.5rem]" aria-label="Primary">
        <Logo />
        <ul className="hidden items-center gap-1 lg:flex">
          {links.map((link) => (
            <li key={link.to}>
              <Link
                href={link.to}
                prefetch={true}
                className={cn(
                  'rounded-full px-4 py-2 text-sm font-semibold transition',
                  isActive(link.to) ? 'bg-blush/60 text-plum shadow-soft' : 'text-muted hover:bg-ivory/80 hover:text-plum',
                )}
              >
                {link.label}
              </Link>
            </li>
          ))}
        </ul>

        {/* Right side: Account + Cart */}
        <div className="flex items-center gap-1">
          <Link
            href={isLoggedIn ? '/account/profile' : '/account/login'}
            className="hidden items-center gap-1.5 rounded-full px-3 py-2 text-sm font-semibold text-plum transition hover:bg-ivory lg:flex"
            aria-label={isLoggedIn ? 'My profile' : 'Login'}
          >
            <User className="h-4 w-4" aria-hidden="true" />
            <span className="max-w-36 truncate">{isLoggedIn ? (customerName || 'My Profile') : 'Login'}</span>
          </Link>

          <Link
            href="/cart"
            className="relative hidden rounded-full p-2 text-plum transition hover:bg-ivory lg:flex"
            aria-label={`Shopping cart${cartCount > 0 ? `, ${cartCount} item${cartCount !== 1 ? 's' : ''}` : ', empty'}`}
          >
            <ShoppingBag className="h-5 w-5" aria-hidden="true" />
            {cartCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-bloom px-1 text-[10px] font-bold text-cream">
                {cartCount > 9 ? '9+' : cartCount}
              </span>
            )}
          </Link>
        </div>

        <button
          type="button"
          className="rounded-full p-2 text-plum transition hover:bg-ivory lg:hidden"
          aria-label={open ? 'Close menu' : 'Open menu'}
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
        >
          {open ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
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
                  prefetch={true}
                  onClick={() => setOpen(false)}
                  className={cn(
                    'rounded-2xl px-4 py-3 text-lg font-semibold',
                    isActive(link.to) ? 'bg-blush/60 text-plum shadow-soft' : 'text-plum hover:bg-ivory/80',
                  )}
                >
                  {link.label}
                </Link>
              ))}
              <div className="mt-3 flex flex-col gap-2 border-t border-sand/60 pt-4">
                <Link
                  href={isLoggedIn ? '/account/profile' : '/account/login'}
                  onClick={() => setOpen(false)}
                  className="flex items-center gap-2 rounded-2xl px-4 py-3 text-base font-semibold text-plum hover:bg-ivory/80"
                  aria-label={isLoggedIn ? 'My profile' : 'Login'}
                >
                  <User className="h-5 w-5" aria-hidden="true" />
                  <span className="max-w-52 truncate">{isLoggedIn ? (customerName || 'My Profile') : 'Login'}</span>
                </Link>
                <Link
                  href="/cart"
                  onClick={() => setOpen(false)}
                  className="relative flex items-center gap-2 rounded-2xl px-4 py-3 text-base font-semibold text-plum hover:bg-ivory/80"
                  aria-label={`Shopping cart${cartCount > 0 ? `, ${cartCount} items` : ', empty'}`}
                >
                  <ShoppingBag className="h-5 w-5" aria-hidden="true" />
                  Cart
                  {cartCount > 0 && (
                    <span className="ml-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-bloom px-1.5 text-xs font-bold text-cream">
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

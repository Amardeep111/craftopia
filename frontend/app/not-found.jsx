import Link from 'next/link'
import Button from '@/components/ui/Button'
import { FlowerBurst } from '@/components/ui/Decor'

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col">
      <div className="container-page flex flex-1 flex-col items-center justify-center py-20 text-center">
        <FlowerBurst className="h-16 w-16 text-petal" />
        <p className="mt-4 text-xs font-semibold uppercase tracking-[0.22em] text-bloom">404</p>
        <h1 className="heading-display mt-3 max-w-lg text-4xl sm:text-5xl">
          This page wandered off the craft table.
        </h1>
        <p className="mt-4 max-w-md text-muted">
          The link may be outdated, or the piece may have been packed away. Let us take you back somewhere cozy.
        </p>
        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <Button as={Link} href="/">
            Go home
          </Button>
          <Button as={Link} href="/shop" variant="secondary">
            Browse the shop
          </Button>
        </div>
      </div>
    </div>
  )
}
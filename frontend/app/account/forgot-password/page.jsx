import Link from 'next/link'
import { ArrowLeft, Mail } from 'lucide-react'
import { site } from '@/data/site'
import { FlowerBurst } from '@/components/ui/Decor'

export const metadata = {
  title: 'Forgot password | Jamae’s Craftopia',
  description: 'Get help recovering access to your Jamae’s Craftopia account.',
}

export default function ForgotPasswordPage() {
  const supportEmail = site.email || 'hello@jamaescraftopia.com'
  const subject = encodeURIComponent('Help recovering my Craftopia account')
  const body = encodeURIComponent('Hello,\n\nI need help recovering access to my account. My account email is: \n\nThank you.')

  return (
    <main className="container-page flex min-h-[calc(100vh-4.5rem)] items-center justify-center px-4 py-16">
      <section className="paper-card w-full max-w-md p-8 sm:p-10">
        <Link href="/account/login" className="mb-8 inline-flex items-center gap-2 text-sm font-semibold text-muted transition hover:text-plum">
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Back to sign in
        </Link>
        <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-blush/80">
          <FlowerBurst className="h-7 w-7 text-bloom" />
        </div>
        <h1 className="heading-display text-3xl">Forgot your password?</h1>
        <p className="mt-3 text-muted">
          Password reset by email isn’t automated yet. Contact our team from the email address on your account and we’ll help you restore access.
        </p>
        <a
          href={`mailto:${supportEmail}?subject=${subject}&body=${body}`}
          className="mt-7 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-full bg-plum px-5 py-3 font-semibold text-cream transition hover:opacity-90"
        >
          <Mail className="h-4 w-4" aria-hidden="true" />
          Email support
        </a>
        <p className="mt-3 break-all text-center text-sm text-muted">{supportEmail}</p>
      </section>
    </main>
  )
}

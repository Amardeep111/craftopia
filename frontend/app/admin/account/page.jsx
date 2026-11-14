import ChangePasswordForm from '@/components/account/ChangePasswordForm'

export default function AdminAccountPage() {
  return <div className="mx-auto max-w-3xl space-y-6"><header><p className="text-xs font-bold tracking-[0.18em] text-accent">Administrator</p><h1 className="font-display text-3xl font-semibold text-ink">My account</h1><p className="mt-1 text-sm text-muted">Update your administrator password.</p></header><ChangePasswordForm /></div>
}

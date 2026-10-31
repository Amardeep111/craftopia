import { redirect } from 'next/navigation'

export default function AdminAboutRedirectPage() {
  redirect('/admin/settings?tab=about')
}

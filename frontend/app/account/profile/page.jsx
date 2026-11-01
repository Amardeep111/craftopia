import { redirect } from 'next/navigation'
import ProfileClient from './ProfileClient'
import { getServerAddresses, getServerUser } from '@/lib/auth/server'

export const dynamic = 'force-dynamic'

export default async function ProfilePage() {
  const user = await getServerUser()
  if (!user) redirect('/account/login?redirect=/account/profile')

  const { addresses, error } = await getServerAddresses()
  return (
    <ProfileClient
      initialProfile={{
        userId: user.userId,
        name: user.name || '',
        email: user.email || '',
        phone: user.phone || '',
      }}
      initialAddresses={addresses}
      initialError={error}
    />
  )
}

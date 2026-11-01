import CheckoutAddressClient from './CheckoutAddressClient'
import { getServerAddresses, getServerUser } from '@/lib/auth/server'

export const dynamic = 'force-dynamic'

export default async function CheckoutAddressPage() {
  const user = await getServerUser()
  const addressResult = user ? await getServerAddresses() : { addresses: [], error: '' }
  return (
    <CheckoutAddressClient
      initialUser={user}
      initialAddresses={addressResult.addresses}
      initialAddressError={addressResult.error}
    />
  )
}

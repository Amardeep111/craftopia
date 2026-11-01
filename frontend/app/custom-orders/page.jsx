import CustomOrdersClient from './CustomOrdersClient'
import { getServerUser } from '@/lib/auth/server'

export const dynamic = 'force-dynamic'

export default async function CustomOrdersPage() {
  const user = await getServerUser()
  return <CustomOrdersClient initialCustomer={user?.role === 'CUSTOMER' ? user : null} />
}

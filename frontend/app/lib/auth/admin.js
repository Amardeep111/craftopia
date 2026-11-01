import 'server-only'
import { ADMIN_PERMISSION_IDS } from '@/lib/auth/permissions'

export const ADMIN_PERMISSIONS = ADMIN_PERMISSION_IDS
export const ADMIN_ROLES = new Set(['ADMIN', 'SUPERADMIN'])

export function hasAdminPermission(user, permission) {
  if (!user) return false
  if (!ADMIN_ROLES.has(user.role)) return false
  if (user.adminActive === false) return false
  if (user?.role === 'SUPERADMIN') return true
  if (user.role !== 'ADMIN') return false
  if (!permission) return true
  if (!Array.isArray(user.adminPermissions)) return false
  if (user.adminPermissions.includes(permission)) return true
  return permission.endsWith('.view') && user.adminPermissions.includes(`${permission.slice(0, -'.view'.length)}.manage`)
}

export async function getAdminSession(token, permission) {
  if (!token) return null
  try {
    const backendUrl = process.env.GO_BACKEND_URL || process.env.NEXT_PUBLIC_API_URL || (process.env.NODE_ENV === 'production' ? 'https://craftopia-backend.vercel.app' : 'http://localhost:8080')
    const res = await fetch(`${backendUrl}/api/auth/me`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: 'no-store',
    })
    const data = await res.json()
    if (!res.ok || !data?.success || !data?.data?.user) return null
    const user = data.data.user
    return hasAdminPermission(user, permission) ? { user } : null
  } catch {
    return null
  }
}

export async function getSuperAdminSession(token) {
  const session = await getAdminSession(token)
  return session?.user?.role === 'SUPERADMIN' && session.user.adminActive !== false ? session : null
}

'use client'

import { createContext, useContext } from 'react'

const AdminAccessContext = createContext({ role: 'ADMIN', permissions: [] })

export function AdminAccessProvider({ role, permissions, children }) {
  return <AdminAccessContext.Provider value={{ role, permissions }}>{children}</AdminAccessContext.Provider>
}

export function useAdminAccess() {
  const { role, permissions } = useContext(AdminAccessContext)
  const isSuperadmin = role === 'SUPERADMIN'
  return {
    role,
    isSuperadmin,
    can: (permission) => isSuperadmin || permissions.includes(permission) || (permission.endsWith('.view') && permissions.includes(`${permission.slice(0, -'.view'.length)}.manage`)),
  }
}

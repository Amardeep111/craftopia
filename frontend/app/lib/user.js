import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { invalidateAuthCache } from './auth/client'

export const useUserStore = create(
  persist(
    (set, get) => ({
      isLoggedIn: false,
      email: null,
      name: null,
      userId: null,

      login(userData) {
        invalidateAuthCache()
        set({
          isLoggedIn: true,
          email: userData.email || userData.contact || null,
          name: userData.name || null,
          userId: userData.userId || null,
        })
      },

      logout() {
        invalidateAuthCache()
        set({
          isLoggedIn: false,
          email: null,
          name: null,
          userId: null,
        })
      },
    }),
    { name: 'jamaes:auth' }
  )
)

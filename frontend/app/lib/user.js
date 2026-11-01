import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export const useUserStore = create(
  persist(
    (set, get) => ({
      isLoggedIn: false,
      email: null,
      name: null,
      userId: null,

      login(userData) {
        set({
          isLoggedIn: true,
          email: userData.email || userData.contact || null,
          name: userData.name || null,
          userId: userData.userId || null,
        })
      },

      logout() {
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

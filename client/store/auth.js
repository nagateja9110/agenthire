'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export const useAuthStore = create(
  persist(
    (set) => ({
      user: null,
      token: null,
      hydrated: false,
      setSession: ({ user, token }) => {
        if (typeof window !== 'undefined') localStorage.setItem('agenthire_token', token);
        set({ user, token });
      },
      logout: () => {
        if (typeof window !== 'undefined') localStorage.removeItem('agenthire_token');
        set({ user: null, token: null });
      },
      setHydrated: () => set({ hydrated: true }),
    }),
    {
      name: 'agenthire-auth',
      partialize: (state) => ({ user: state.user, token: state.token }),
      onRehydrateStorage: () => (state) => {
        // Keep the api client's token mirror in sync after rehydration.
        if (state?.token && typeof window !== 'undefined') {
          localStorage.setItem('agenthire_token', state.token);
        }
        state?.setHydrated();
      },
    }
  )
);

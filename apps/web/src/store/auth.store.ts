import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { AuthUser, Role } from '@/types';

interface AuthState {
  user: AuthUser | null;
  isLoading: boolean;
  setUser: (user: AuthUser | null) => void;
  setLoading: (loading: boolean) => void;
  logout: () => void;
  activeRole: Role | null;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      isLoading: true,
      activeRole: null,

      setUser: (user) =>
        set({ user, isLoading: false, activeRole: user?.activeRole ?? null }),

      setLoading: (isLoading) => set({ isLoading }),

      logout: () =>
        set({ user: null, isLoading: false, activeRole: null }),
    }),
    {
      name: 'ga-auth',
      partialize: (state) => ({ user: state.user, activeRole: state.activeRole }),
    },
  ),
);

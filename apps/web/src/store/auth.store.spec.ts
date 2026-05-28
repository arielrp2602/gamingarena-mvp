import { useAuthStore } from './auth.store';
import type { AuthUser } from '@/types';

const mockUser: AuthUser = {
  id: 'user-123',
  email: 'jugador@example.com',
  roles: ['JUGADOR'],
  activeRole: 'JUGADOR',
  emailVerified: true,
  onboardingDone: true,
  suspended: false,
};

// ── useAuthStore ───────────────────────────────────────────────────────────────

describe('useAuthStore', () => {
  beforeEach(() => {
    useAuthStore.setState({ user: null, isLoading: true, activeRole: null });
  });

  describe('estado inicial', () => {
    it('tiene user null, isLoading true y activeRole null por defecto', () => {
      const state = useAuthStore.getState();
      expect(state.user).toBeNull();
      expect(state.isLoading).toBe(true);
      expect(state.activeRole).toBeNull();
    });
  });

  describe('setUser', () => {
    it('actualiza user, pone isLoading en false y setea activeRole del usuario', () => {
      useAuthStore.getState().setUser(mockUser);
      const state = useAuthStore.getState();
      expect(state.user).toEqual(mockUser);
      expect(state.isLoading).toBe(false);
      expect(state.activeRole).toBe('JUGADOR');
    });

    it('al pasar null limpia user y activeRole queda null', () => {
      useAuthStore.getState().setUser(mockUser);
      useAuthStore.getState().setUser(null);
      const state = useAuthStore.getState();
      expect(state.user).toBeNull();
      expect(state.activeRole).toBeNull();
    });

    it('setea activeRole según el rol activo del usuario', () => {
      const tiendaUser: AuthUser = { ...mockUser, activeRole: 'TIENDA', roles: ['TIENDA'] };
      useAuthStore.getState().setUser(tiendaUser);
      expect(useAuthStore.getState().activeRole).toBe('TIENDA');
    });
  });

  describe('setLoading', () => {
    it('actualiza isLoading a false', () => {
      useAuthStore.getState().setLoading(false);
      expect(useAuthStore.getState().isLoading).toBe(false);
    });

    it('actualiza isLoading a true', () => {
      useAuthStore.setState({ isLoading: false });
      useAuthStore.getState().setLoading(true);
      expect(useAuthStore.getState().isLoading).toBe(true);
    });
  });

  describe('logout', () => {
    it('limpia user, pone isLoading en false y activeRole en null', () => {
      useAuthStore.getState().setUser(mockUser);
      useAuthStore.getState().logout();
      const state = useAuthStore.getState();
      expect(state.user).toBeNull();
      expect(state.isLoading).toBe(false);
      expect(state.activeRole).toBeNull();
    });
  });
});

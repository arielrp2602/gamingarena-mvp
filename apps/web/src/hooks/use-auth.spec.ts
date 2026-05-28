import { renderHook } from '@testing-library/react';
import * as rq from '@tanstack/react-query';
import { useAuthStore } from '@/store/auth.store';
import { useAuth } from './use-auth';
import type { AuthUser } from '@/types';

jest.mock('@tanstack/react-query');
jest.mock('@/lib/api');
jest.mock('@/store/auth.store');
jest.mock('next/navigation');

const mockUseQuery = rq.useQuery as jest.Mock;
const mockUseMutation = rq.useMutation as jest.Mock;
const mockUseQueryClient = rq.useQueryClient as jest.Mock;
const mockUseAuthStore = useAuthStore as unknown as jest.Mock;

const mockUser: AuthUser = {
  id: 'user-001',
  email: 'test@example.com',
  roles: ['JUGADOR'],
  activeRole: 'JUGADOR',
  emailVerified: true,
  onboardingDone: true,
  suspended: false,
};

// ── useAuth ────────────────────────────────────────────────────────────────────

describe('useAuth', () => {
  let mockMutateAsync: jest.Mock;
  let mockInvalidateQueries: jest.Mock;
  let mockClear: jest.Mock;

  beforeEach(() => {
    mockMutateAsync = jest.fn();
    mockInvalidateQueries = jest.fn();
    mockClear = jest.fn();

    mockUseQuery.mockReturnValue({ isLoading: false, data: null });
    mockUseMutation.mockReturnValue({
      mutateAsync: mockMutateAsync,
      isPending: false,
      error: null,
    });
    mockUseQueryClient.mockReturnValue({
      invalidateQueries: mockInvalidateQueries,
      clear: mockClear,
    });
    mockUseAuthStore.mockReturnValue({
      user: null,
      setUser: jest.fn(),
      logout: jest.fn(),
      isLoading: false,
    });
  });

  describe('isAuthenticated', () => {
    it('retorna isAuthenticated false cuando el usuario es null', () => {
      mockUseAuthStore.mockReturnValue({
        user: null,
        setUser: jest.fn(),
        logout: jest.fn(),
        isLoading: false,
      });
      const { result } = renderHook(() => useAuth());
      expect(result.current.isAuthenticated).toBe(false);
    });

    it('retorna isAuthenticated true cuando el store tiene un usuario', () => {
      mockUseAuthStore.mockReturnValue({
        user: mockUser,
        setUser: jest.fn(),
        logout: jest.fn(),
        isLoading: false,
      });
      const { result } = renderHook(() => useAuth());
      expect(result.current.isAuthenticated).toBe(true);
    });
  });

  describe('isLoading', () => {
    it('isLoading es true cuando store.isLoading es true', () => {
      mockUseAuthStore.mockReturnValue({
        user: null,
        setUser: jest.fn(),
        logout: jest.fn(),
        isLoading: true,
      });
      mockUseQuery.mockReturnValue({ isLoading: false, data: null });
      const { result } = renderHook(() => useAuth());
      expect(result.current.isLoading).toBe(true);
    });

    it('isLoading es true cuando la query está cargando', () => {
      mockUseAuthStore.mockReturnValue({
        user: null,
        setUser: jest.fn(),
        logout: jest.fn(),
        isLoading: false,
      });
      mockUseQuery.mockReturnValue({ isLoading: true, data: null });
      const { result } = renderHook(() => useAuth());
      expect(result.current.isLoading).toBe(true);
    });

    it('isLoading es false cuando ambos (store y query) no están cargando', () => {
      mockUseAuthStore.mockReturnValue({
        user: null,
        setUser: jest.fn(),
        logout: jest.fn(),
        isLoading: false,
      });
      mockUseQuery.mockReturnValue({ isLoading: false, data: null });
      const { result } = renderHook(() => useAuth());
      expect(result.current.isLoading).toBe(false);
    });
  });

  describe('login()', () => {
    it('llama a mutateAsync con el dto de email y password', async () => {
      const { result } = renderHook(() => useAuth());
      const dto = { email: 'user@example.com', password: 'pass123' };
      await result.current.login(dto);
      expect(mockMutateAsync).toHaveBeenCalledWith(dto);
    });
  });

  describe('logout()', () => {
    it('llama a mutateAsync sin argumentos', async () => {
      const { result } = renderHook(() => useAuth());
      await result.current.logout();
      expect(mockMutateAsync).toHaveBeenCalled();
    });
  });

  describe('switchRole()', () => {
    it('llama a mutateAsync con el rol indicado', async () => {
      const { result } = renderHook(() => useAuth());
      await result.current.switchRole('TIENDA');
      expect(mockMutateAsync).toHaveBeenCalledWith('TIENDA');
    });
  });

  describe('loginError', () => {
    it('loginError es null cuando la mutación no tiene error', () => {
      mockUseMutation.mockReturnValue({
        mutateAsync: mockMutateAsync,
        isPending: false,
        error: null,
      });
      const { result } = renderHook(() => useAuth());
      expect(result.current.loginError).toBeNull();
    });

    it('loginError es un string cuando la mutación tiene error', () => {
      mockUseMutation.mockReturnValue({
        mutateAsync: mockMutateAsync,
        isPending: false,
        error: { response: { data: { message: 'Credenciales inválidas' } } },
      });
      const { result } = renderHook(() => useAuth());
      expect(typeof result.current.loginError).toBe('string');
      expect(result.current.loginError).toBe('Credenciales inválidas');
    });
  });
});

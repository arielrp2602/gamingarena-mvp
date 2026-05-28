import { renderHook } from '@testing-library/react';
import * as rq from '@tanstack/react-query';
import { useAuthStore } from '@/store/auth.store';
import { useNotificaciones } from './use-notificaciones';
import type { AuthUser, Notificacion } from '@/types';

jest.mock('@tanstack/react-query');
jest.mock('@/lib/api');
jest.mock('@/store/auth.store');

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

const mockNotificaciones: Notificacion[] = [
  {
    id: 'notif-001',
    tipo: 'TORNEO_ABIERTO',
    mensaje: 'El torneo ha comenzado',
    leida: false,
    link: '/torneos/123',
    createdAt: '2025-09-01T10:00:00.000Z',
  },
  {
    id: 'notif-002',
    tipo: 'INSCRIPCION_CONFIRMADA',
    mensaje: 'Tu inscripción fue confirmada',
    leida: true,
    link: null,
    createdAt: '2025-09-02T10:00:00.000Z',
  },
];

// ── useNotificaciones ──────────────────────────────────────────────────────────

describe('useNotificaciones', () => {
  let mockMutate: jest.Mock;
  let mockInvalidateQueries: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    mockMutate = jest.fn();
    mockInvalidateQueries = jest.fn();

    mockUseQuery.mockReturnValue({ data: undefined, isLoading: false });
    mockUseMutation.mockReturnValue({ mutate: mockMutate, isPending: false });
    mockUseQueryClient.mockReturnValue({ invalidateQueries: mockInvalidateQueries });
    mockUseAuthStore.mockReturnValue({ user: mockUser });
  });

  describe('cuando no hay datos', () => {
    it('retorna notificaciones vacías y unread 0', () => {
      mockUseQuery.mockReturnValue({ data: undefined, isLoading: false });
      const { result } = renderHook(() => useNotificaciones());
      expect(result.current.notificaciones).toEqual([]);
      expect(result.current.unread).toBe(0);
    });
  });

  describe('cuando hay datos en la query', () => {
    it('retorna las notificaciones y el conteo de no leídas', () => {
      mockUseQuery.mockReturnValue({
        data: { notificaciones: mockNotificaciones, unread: 1 },
        isLoading: false,
      });
      const { result } = renderHook(() => useNotificaciones());
      expect(result.current.notificaciones).toEqual(mockNotificaciones);
      expect(result.current.unread).toBe(1);
    });
  });

  describe('isLoading', () => {
    it('refleja el estado de carga de la query', () => {
      mockUseQuery.mockReturnValue({ data: undefined, isLoading: true });
      const { result } = renderHook(() => useNotificaciones());
      expect(result.current.isLoading).toBe(true);
    });

    it('isLoading es false cuando la query no está cargando', () => {
      mockUseQuery.mockReturnValue({ data: undefined, isLoading: false });
      const { result } = renderHook(() => useNotificaciones());
      expect(result.current.isLoading).toBe(false);
    });
  });

  describe('markRead()', () => {
    it('llama a mutate con el id de la notificación', () => {
      const { result } = renderHook(() => useNotificaciones());
      result.current.markRead('notif-001');
      expect(mockMutate).toHaveBeenCalledWith('notif-001');
    });
  });

  describe('markAllRead()', () => {
    it('llama a mutate sin argumentos', () => {
      const { result } = renderHook(() => useNotificaciones());
      result.current.markAllRead();
      expect(mockMutate).toHaveBeenCalled();
    });
  });

  describe('enabled de la query', () => {
    it('la query NO está habilitada cuando el usuario es null', () => {
      mockUseAuthStore.mockReturnValue({ user: null });
      renderHook(() => useNotificaciones());
      // Verificar que useQuery fue llamado con enabled: false
      const callArgs = mockUseQuery.mock.calls[0][0];
      expect(callArgs.enabled).toBe(false);
    });

    it('la query está habilitada cuando hay un usuario', () => {
      mockUseAuthStore.mockReturnValue({ user: mockUser });
      renderHook(() => useNotificaciones());
      const callArgs = mockUseQuery.mock.calls[0][0];
      expect(callArgs.enabled).toBe(true);
    });
  });
});

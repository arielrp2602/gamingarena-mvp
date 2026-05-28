'use client';

import { useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { useAuthStore } from '@/store/auth.store';
import { getErrorMessage } from '@/lib/utils';
import type { AuthUser } from '@/types';

export function useAuth() {
  const router = useRouter();
  const qc = useQueryClient();
  const { user, setUser, logout: storeLogout, isLoading } = useAuthStore();

  // Cargar usuario actual
  const { isLoading: queryLoading } = useQuery({
    queryKey: ['auth', 'me'],
    queryFn: async () => {
      const res = await api.get<AuthUser>('/auth/me');
      setUser(res.data);
      return res.data;
    },
    retry: false,
    staleTime: 5 * 60 * 1000,
  });

  // Login
  const loginMutation = useMutation({
    mutationFn: (dto: { email: string; password: string }) =>
      api.post<AuthUser>('/auth/login', dto),
    onSuccess: (res) => {
      setUser(res.data);
      qc.invalidateQueries({ queryKey: ['auth'] });
    },
  });

  // Register
  const registerMutation = useMutation({
    mutationFn: (dto: Record<string, unknown>) =>
      api.post<AuthUser>('/auth/register', dto),
    onSuccess: (res) => {
      setUser(res.data);
    },
  });

  // Logout
  const logoutMutation = useMutation({
    mutationFn: () => api.post('/auth/logout'),
    onSuccess: () => {
      storeLogout();
      qc.clear();
      router.push('/login');
    },
  });

  // Switch role
  const switchRoleMutation = useMutation({
    mutationFn: (role: string) => api.post('/auth/switch-role', { role }),
    onSuccess: (res) => {
      setUser(res.data);
    },
  });

  const login = useCallback(
    async (dto: { email: string; password: string }) => {
      await loginMutation.mutateAsync(dto);
    },
    [loginMutation],
  );

  const register = useCallback(
    async (dto: Record<string, unknown>) => {
      await registerMutation.mutateAsync(dto);
    },
    [registerMutation],
  );

  const logout = useCallback(async () => {
    await logoutMutation.mutateAsync();
  }, [logoutMutation]);

  const switchRole = useCallback(
    async (role: string) => {
      await switchRoleMutation.mutateAsync(role);
    },
    [switchRoleMutation],
  );

  return {
    user,
    isLoading: isLoading || queryLoading,
    isAuthenticated: !!user,
    login,
    register,
    logout,
    switchRole,
    loginError: loginMutation.error ? getErrorMessage(loginMutation.error) : null,
    registerError: registerMutation.error ? getErrorMessage(registerMutation.error) : null,
    isLoginPending: loginMutation.isPending,
    isRegisterPending: registerMutation.isPending,
    isLogoutPending: logoutMutation.isPending,
    isSwitchRolePending: switchRoleMutation.isPending,
  };
}

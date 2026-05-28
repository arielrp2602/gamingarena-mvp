'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { useAuthStore } from '@/store/auth.store';
import type { Notificacion } from '@/types';

interface NotifResponse {
  notificaciones: Notificacion[];
  unread: number;
}

export function useNotificaciones() {
  const qc = useQueryClient();
  const { user } = useAuthStore();

  const { data, isLoading } = useQuery({
    queryKey: ['notificaciones'],
    queryFn: async () => {
      const res = await api.get<NotifResponse>('/notificaciones');
      return res.data;
    },
    enabled: !!user,
    refetchInterval: 30_000, // polling cada 30s
    staleTime: 20_000,
  });

  const markReadMutation = useMutation({
    mutationFn: (id: string) => api.patch(`/notificaciones/${id}/read`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['notificaciones'] }),
  });

  const markAllReadMutation = useMutation({
    mutationFn: () => api.patch('/notificaciones/read-all'),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['notificaciones'] }),
  });

  return {
    notificaciones: data?.notificaciones ?? [],
    unread: data?.unread ?? 0,
    isLoading,
    markRead: (id: string) => markReadMutation.mutate(id),
    markAllRead: () => markAllReadMutation.mutate(),
  };
}

'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import {
  TrophyIcon,
  ClipboardListIcon,
  BellIcon,
  ArrowRightIcon,
  CalendarDaysIcon,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { TorneoStatusBadge } from '@/components/torneos/torneo-status-badge';
import { useAuthStore } from '@/store/auth.store';
import { useNotificaciones } from '@/hooks/use-notificaciones';
import api from '@/lib/api';
import { formatDate } from '@/lib/utils';
import type { Torneo, PaginatedResponse } from '@/types';

export default function DashboardPage() {
  const { user } = useAuthStore();
  const { unread } = useNotificaciones();

  const { data: torneosRecientes, isLoading } = useQuery({
    queryKey: ['torneos', 'abiertos-dashboard'],
    queryFn: async () => {
      const res = await api.get<PaginatedResponse<Torneo>>(
        '/torneos?status=ABIERTO&perPage=4',
      );
      return res.data.data;
    },
    staleTime: 60_000,
  });

  const displayName =
    user?.activeRole === 'JUGADOR'
      ? user?.jugadorProfile?.nombre
      : user?.activeRole === 'TIENDA'
      ? user?.tiendaProfile?.nombre
      : user?.activeRole === 'JUEZ'
      ? 'Juez'
      : 'Admin';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="font-heading text-2xl font-bold">
          Hola, {displayName ?? user?.email} 👋
        </h1>
        <p className="text-muted-foreground">
          {new Date().toLocaleDateString('es-MX', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
          })}
        </p>
      </div>

      {/* Quick stats */}
      <div className="grid gap-3 sm:grid-cols-3">
        <Card size="sm">
          <CardContent className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-xl bg-primary/15">
              <TrophyIcon className="size-5 text-primary" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Torneos activos</p>
              <p className="font-heading text-xl font-bold">—</p>
            </div>
          </CardContent>
        </Card>
        <Card size="sm">
          <CardContent className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-xl bg-info/15">
              <ClipboardListIcon className="size-5 text-info" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Inscripciones</p>
              <p className="font-heading text-xl font-bold">—</p>
            </div>
          </CardContent>
        </Card>
        <Card size="sm">
          <CardContent className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-xl bg-gaming-purple/15">
              <BellIcon className="size-5 text-gaming-purple" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Notificaciones</p>
              <p className="font-heading text-xl font-bold">{unread}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick actions según rol */}
      {user?.activeRole === 'JUGADOR' && (
        <div className="flex flex-wrap gap-2">
          <Button asChild>
            <Link href="/torneos">
              <TrophyIcon className="mr-2 size-4" />
              Ver torneos disponibles
            </Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href="/mis-torneos">
              <ClipboardListIcon className="mr-2 size-4" />
              Mis inscripciones
            </Link>
          </Button>
        </div>
      )}

      {user?.activeRole === 'TIENDA' && (
        <div className="flex flex-wrap gap-2">
          <Button asChild>
            <Link href="/tienda/torneos/nuevo">
              <CalendarDaysIcon className="mr-2 size-4" />
              Crear torneo
            </Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href="/tienda/torneos">Ver mis torneos</Link>
          </Button>
        </div>
      )}

      {user?.activeRole === 'JUEZ' && (
        <div className="flex flex-wrap gap-2">
          <Button asChild>
            <Link href="/juez/disputas">Ver disputas pendientes</Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href="/juez">Mis torneos</Link>
          </Button>
        </div>
      )}

      {user?.activeRole === 'ADMIN' && (
        <div className="flex flex-wrap gap-2">
          <Button asChild>
            <Link href="/admin/tiendas">Verificar tiendas</Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href="/admin">Panel admin</Link>
          </Button>
        </div>
      )}

      {/* Torneos abiertos */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-heading font-semibold">Torneos abiertos</h2>
          <Button variant="ghost" size="sm" asChild>
            <Link href="/torneos">
              Ver todos <ArrowRightIcon className="ml-1 size-3" />
            </Link>
          </Button>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          {isLoading
            ? Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-20 rounded-xl" />
              ))
            : torneosRecientes?.map((t) => (
                <Link
                  key={t.id}
                  href={`/torneos/${t.id}`}
                  className="flex items-center gap-3 rounded-xl border border-border bg-card px-4 py-3 transition-colors hover:border-primary/30 hover:bg-primary/5"
                >
                  <div className="flex-1 min-w-0">
                    <p className="truncate text-sm font-medium">{t.nombre}</p>
                    <p className="text-xs text-muted-foreground">
                      {t.juego.nombre} · {formatDate(t.fechaInicio)}
                    </p>
                  </div>
                  <TorneoStatusBadge status={t.status} />
                </Link>
              ))}
        </div>
      </div>
    </div>
  );
}

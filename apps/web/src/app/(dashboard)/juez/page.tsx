'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { SwordsIcon, ShieldCheckIcon, AlertTriangleIcon, ArrowRightIcon } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { TorneoStatusBadge } from '@/components/torneos/torneo-status-badge';
import { useAuthStore } from '@/store/auth.store';
import api from '@/lib/api';
import { formatDate } from '@/lib/utils';
import type { Torneo } from '@/types';

interface JuezStats {
  torneosPendientes: number;
  torneosEnCurso: number;
  disputasPendientes: number;
}

export default function JuezDashboardPage() {
  const { user } = useAuthStore();

  const { data: stats, isLoading: statsLoading } = useQuery<JuezStats>({
    queryKey: ['juez-stats'],
    queryFn: async () => {
      const res = await api.get<JuezStats>('/juez/stats');
      return res.data;
    },
    refetchInterval: 30_000,
  });

  const { data: torneos, isLoading: torneosLoading } = useQuery<Torneo[]>({
    queryKey: ['juez-torneos'],
    queryFn: async () => {
      const res = await api.get<Torneo[]>('/juez/torneos');
      return res.data;
    },
    refetchInterval: 30_000,
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-bold">
          Hola, {user?.juezProfile?.nombre ?? 'Juez'} ⚖️
        </h1>
        <p className="text-sm text-muted-foreground">Panel de árbitro</p>
      </div>

      {/* Stats */}
      <div className="grid gap-3 sm:grid-cols-3">
        {statsLoading
          ? Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-xl" />)
          : (
            <>
              <Card size="sm">
                <CardContent className="flex items-center gap-3">
                  <div className="flex size-10 items-center justify-center rounded-xl bg-primary/15">
                    <ShieldCheckIcon className="size-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Torneos asignados</p>
                    <p className="font-heading text-xl font-bold">{stats?.torneosPendientes ?? 0}</p>
                  </div>
                </CardContent>
              </Card>
              <Card size="sm">
                <CardContent className="flex items-center gap-3">
                  <div className="flex size-10 items-center justify-center rounded-xl bg-cyan-500/15">
                    <SwordsIcon className="size-5 text-cyan-400" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">En curso</p>
                    <p className="font-heading text-xl font-bold">{stats?.torneosEnCurso ?? 0}</p>
                  </div>
                </CardContent>
              </Card>
              <Card size="sm">
                <CardContent className="flex items-center gap-3">
                  <div className="flex size-10 items-center justify-center rounded-xl bg-amber-500/15">
                    <AlertTriangleIcon className="size-5 text-amber-400" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Disputas pendientes</p>
                    <p className="font-heading text-xl font-bold">{stats?.disputasPendientes ?? 0}</p>
                  </div>
                </CardContent>
              </Card>
            </>
          )}
      </div>

      {/* CTA */}
      {(stats?.disputasPendientes ?? 0) > 0 && (
        <div className="flex items-center justify-between rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3">
          <div className="flex items-center gap-2">
            <AlertTriangleIcon className="size-4 text-amber-400" />
            <p className="text-sm font-medium text-amber-400">
              {stats?.disputasPendientes} disputa{stats?.disputasPendientes !== 1 ? 's' : ''} por resolver
            </p>
          </div>
          <Button size="sm" asChild>
            <Link href="/juez/disputas">Revisar</Link>
          </Button>
        </div>
      )}

      {/* Torneos asignados */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-heading font-semibold">Torneos asignados</h2>
        </div>
        {torneosLoading ? (
          <div className="space-y-2">
            {[1, 2].map((i) => <Skeleton key={i} className="h-16 rounded-xl" />)}
          </div>
        ) : (torneos ?? []).length === 0 ? (
          <Card>
            <CardContent className="py-10 text-center text-sm text-muted-foreground">
              No tienes torneos asignados
            </CardContent>
          </Card>
        ) : (
          <div className="divide-y divide-border rounded-xl border border-border bg-card overflow-hidden">
            {torneos!.map((t) => (
              <div key={t.id} className="flex items-center gap-3 px-4 py-3">
                <div className="flex-1 min-w-0">
                  <p className="truncate font-medium text-sm">{t.nombre}</p>
                  <p className="text-xs text-muted-foreground">
                    {t.juego.nombre} · {t.tienda.nombre} · {formatDate(t.fechaInicio)}
                  </p>
                </div>
                <TorneoStatusBadge status={t.status} />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

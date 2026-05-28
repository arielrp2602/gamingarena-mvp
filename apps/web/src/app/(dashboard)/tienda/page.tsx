'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import {
  TrophyIcon,
  UsersIcon,
  CheckCircleIcon,
  AlertCircleIcon,
  ArrowRightIcon,
  PlusIcon,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { TorneoStatusBadge } from '@/components/torneos/torneo-status-badge';
import { useAuthStore } from '@/store/auth.store';
import api from '@/lib/api';
import { formatDate } from '@/lib/utils';
import type { Torneo, PaginatedResponse, VerificationStatus } from '@/types';

interface TiendaStats {
  totalTorneos: number;
  torneosActivos: number;
  totalInscritos: number;
  ingresosMes: number;
  verificationStatus: VerificationStatus;
}

const VERIFICATION_BADGE: Record<VerificationStatus, { label: string; cls: string }> = {
  PENDIENTE: { label: 'Pendiente verificación', cls: 'border-amber-500/30 bg-amber-500/10 text-amber-400' },
  VERIFICADO: { label: 'Tienda verificada', cls: 'border-green-500/30 bg-green-500/10 text-green-400' },
  RECHAZADO: { label: 'Verificación rechazada', cls: 'border-destructive/30 bg-destructive/10 text-destructive' },
};

export default function TiendaDashboardPage() {
  const { user } = useAuthStore();

  const { data: stats, isLoading: statsLoading } = useQuery<TiendaStats>({
    queryKey: ['tienda-stats'],
    queryFn: async () => {
      const res = await api.get<TiendaStats>('/tienda/stats');
      return res.data;
    },
    staleTime: 60_000,
  });

  const { data: torneosRecientes, isLoading: torneosLoading } = useQuery({
    queryKey: ['tienda-torneos-recientes'],
    queryFn: async () => {
      const res = await api.get<PaginatedResponse<Torneo>>('/tienda/torneos?perPage=5');
      return res.data.data;
    },
    staleTime: 30_000,
  });

  const verif = stats?.verificationStatus
    ? VERIFICATION_BADGE[stats.verificationStatus]
    : null;

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="font-heading text-2xl font-bold">
            {user?.tiendaProfile?.nombre ?? 'Mi tienda'}
          </h1>
          <p className="text-sm text-muted-foreground">{user?.tiendaProfile?.ciudad}</p>
        </div>
        {verif && (
          <Badge variant="outline" className={verif.cls}>
            {verif.label}
          </Badge>
        )}
      </div>

      {/* Stats */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {statsLoading
          ? Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-xl" />)
          : (
            <>
              <StatCard
                label="Total torneos"
                value={stats?.totalTorneos ?? 0}
                icon={<TrophyIcon className="size-5 text-primary" />}
                color="bg-primary/15"
              />
              <StatCard
                label="Torneos activos"
                value={stats?.torneosActivos ?? 0}
                icon={<CheckCircleIcon className="size-5 text-green-400" />}
                color="bg-green-500/15"
              />
              <StatCard
                label="Jugadores inscritos"
                value={stats?.totalInscritos ?? 0}
                icon={<UsersIcon className="size-5 text-cyan-400" />}
                color="bg-cyan-500/15"
              />
              <StatCard
                label="Ingresos (mes)"
                value={`$${(stats?.ingresosMes ?? 0).toLocaleString('es-MX')}`}
                icon={<AlertCircleIcon className="size-5 text-amber-400" />}
                color="bg-amber-500/15"
              />
            </>
          )}
      </div>

      {/* Quick actions */}
      <div className="flex flex-wrap gap-2">
        <Button asChild>
          <Link href="/tienda/torneos/nuevo">
            <PlusIcon className="mr-1 size-4" />
            Crear torneo
          </Link>
        </Button>
        <Button variant="outline" asChild>
          <Link href="/tienda/torneos">Ver todos mis torneos</Link>
        </Button>
      </div>

      {/* Torneos recientes */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-heading font-semibold">Torneos recientes</h2>
          <Button variant="ghost" size="sm" asChild>
            <Link href="/tienda/torneos">
              Ver todos <ArrowRightIcon className="ml-1 size-3" />
            </Link>
          </Button>
        </div>

        {torneosLoading ? (
          <div className="space-y-2">
            {[1, 2, 3].map((i) => <Skeleton key={i} className="h-14 rounded-xl" />)}
          </div>
        ) : (torneosRecientes ?? []).length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-sm text-muted-foreground">
              Sin torneos aún.{' '}
              <Link href="/tienda/torneos/nuevo" className="text-primary underline">
                Crea el primero
              </Link>
            </CardContent>
          </Card>
        ) : (
          <div className="divide-y divide-border rounded-xl border border-border bg-card overflow-hidden">
            {torneosRecientes!.map((t) => (
              <Link
                key={t.id}
                href={`/tienda/torneos/${t.id}`}
                className="flex items-center gap-3 px-4 py-3 hover:bg-muted/30 transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <p className="truncate text-sm font-medium">{t.nombre}</p>
                  <p className="text-xs text-muted-foreground">
                    {t.juego.nombre} · {formatDate(t.fechaInicio)} · {t._count?.inscripciones ?? 0} inscritos
                  </p>
                </div>
                <TorneoStatusBadge status={t.status} />
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({
  label, value, icon, color,
}: {
  label: string; value: string | number; icon: React.ReactNode; color: string;
}) {
  return (
    <Card size="sm">
      <CardContent className="flex items-center gap-3">
        <div className={`flex size-10 items-center justify-center rounded-xl ${color}`}>
          {icon}
        </div>
        <div>
          <p className="text-xs text-muted-foreground">{label}</p>
          <p className="font-heading text-xl font-bold">{value}</p>
        </div>
      </CardContent>
    </Card>
  );
}

'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { PlusIcon, SearchIcon } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { TorneoStatusBadge, TorneoTipoBadge } from '@/components/torneos/torneo-status-badge';
import api from '@/lib/api';
import { formatDate } from '@/lib/utils';
import type { Torneo, PaginatedResponse, TorneoStatus } from '@/types';

const STATUS_TABS: { value: TorneoStatus | ''; label: string }[] = [
  { value: '', label: 'Todos' },
  { value: 'BORRADOR', label: 'Borradores' },
  { value: 'ABIERTO', label: 'Abiertos' },
  { value: 'EN_CURSO', label: 'En curso' },
  { value: 'FINALIZADO', label: 'Finalizados' },
];

export default function TiendaTorneosPage() {
  const [status, setStatus] = useState<TorneoStatus | ''>('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ['tienda-torneos', status, search, page],
    queryFn: async () => {
      const params = new URLSearchParams({ page: String(page), perPage: '10' });
      if (status) params.set('status', status);
      if (search) params.set('search', search);
      const res = await api.get<PaginatedResponse<Torneo>>(`/tienda/torneos?${params}`);
      return res.data;
    },
    staleTime: 30_000,
  });

  const torneos = data?.data ?? [];

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="font-heading text-2xl font-bold">Mis torneos</h1>
        <Button asChild>
          <Link href="/tienda/torneos/nuevo">
            <PlusIcon className="mr-1 size-4" />
            Nuevo torneo
          </Link>
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1 max-w-xs">
          <SearchIcon className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="Buscar torneo…"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          />
        </div>
        <div className="flex flex-wrap gap-1.5">
          {STATUS_TABS.map((tab) => (
            <button
              key={tab.value}
              onClick={() => { setStatus(tab.value); setPage(1); }}
              className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                status === tab.value
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground hover:bg-muted/70'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* List */}
      {isLoading ? (
        <div className="space-y-2">
          {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-16 rounded-xl" />)}
        </div>
      ) : torneos.length === 0 ? (
        <Card>
          <CardContent className="py-14 text-center text-sm text-muted-foreground">
            Sin torneos que mostrar.
          </CardContent>
        </Card>
      ) : (
        <div className="divide-y divide-border rounded-xl border border-border bg-card overflow-hidden">
          {torneos.map((t) => (
            <Link
              key={t.id}
              href={`/tienda/torneos/${t.id}`}
              className="flex items-center gap-4 px-4 py-3.5 hover:bg-muted/30 transition-colors"
            >
              <div className="flex-1 min-w-0">
                <p className="truncate font-medium text-sm">{t.nombre}</p>
                <p className="text-xs text-muted-foreground">
                  {t.juego.nombre} · {formatDate(t.fechaInicio)} · {t._count?.inscripciones ?? 0}/{t.cupoMaximo} inscritos
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <TorneoTipoBadge tipo={t.tipoTorneo} />
                <TorneoStatusBadge status={t.status} />
              </div>
            </Link>
          ))}
        </div>
      )}

      {/* Pagination */}
      {data && data.totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={page === 1}
            onClick={() => setPage((p) => p - 1)}
          >
            Anterior
          </Button>
          <span className="text-sm text-muted-foreground">
            {page} / {data.totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={page === data.totalPages}
            onClick={() => setPage((p) => p + 1)}
          >
            Siguiente
          </Button>
        </div>
      )}
    </div>
  );
}

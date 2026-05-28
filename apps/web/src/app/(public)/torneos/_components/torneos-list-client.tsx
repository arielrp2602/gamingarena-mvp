'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { SearchIcon, FilterIcon } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { TorneoCard } from '@/components/torneos/torneo-card';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/shared/empty-state';
import api from '@/lib/api';
import type { Juego, PaginatedResponse, Torneo, TorneoStatus } from '@/types';

interface TorneosListClientProps {
  initial: PaginatedResponse<Torneo>;
  juegos: Juego[];
}

const STATUS_OPTIONS: { value: TorneoStatus | 'TODOS'; label: string }[] = [
  { value: 'TODOS', label: 'Todos los estados' },
  { value: 'ABIERTO', label: 'Inscripciones abiertas' },
  { value: 'EN_CURSO', label: 'En curso' },
  { value: 'FINALIZADO', label: 'Finalizados' },
];

export function TorneosListClient({ initial, juegos }: TorneosListClientProps) {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('TODOS');
  const [juegoFilter, setJuegoFilter] = useState<string>('TODOS');
  const [page, setPage] = useState(1);

  const queryParams = new URLSearchParams({
    page: String(page),
    perPage: '12',
    ...(search ? { nombre: search } : {}),
    ...(statusFilter !== 'TODOS' ? { status: statusFilter } : {}),
    ...(juegoFilter !== 'TODOS' ? { juegoId: juegoFilter } : {}),
  });

  const { data, isLoading } = useQuery({
    queryKey: ['torneos', 'public', queryParams.toString()],
    queryFn: async () => {
      const res = await api.get<PaginatedResponse<Torneo>>(`/torneos?${queryParams}`);
      return res.data;
    },
    placeholderData: initial,
    staleTime: 30_000,
  });

  const torneos = data?.data ?? [];
  const totalPages = data?.totalPages ?? 1;

  return (
    <div className="space-y-6">
      {/* Filtros */}
      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <SearchIcon className="absolute left-2.5 top-2 size-4 text-muted-foreground" />
          <Input
            placeholder="Buscar torneos..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="pl-8"
          />
        </div>
        <Select
          value={statusFilter}
          onValueChange={(v) => { setStatusFilter(v); setPage(1); }}
        >
          <SelectTrigger className="w-full sm:w-52">
            <SelectValue placeholder="Estado" />
          </SelectTrigger>
          <SelectContent>
            {STATUS_OPTIONS.map((o) => (
              <SelectItem key={o.value} value={o.value}>
                {o.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          value={juegoFilter}
          onValueChange={(v) => { setJuegoFilter(v); setPage(1); }}
        >
          <SelectTrigger className="w-full sm:w-44">
            <SelectValue placeholder="Juego" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="TODOS">Todos los juegos</SelectItem>
            {juegos.map((j) => (
              <SelectItem key={j.id} value={j.id}>
                {j.nombre}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Grid */}
      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-64 w-full rounded-xl" />
          ))}
        </div>
      ) : torneos.length === 0 ? (
        <EmptyState
          icon={FilterIcon}
          title="No hay torneos"
          description="Intenta cambiar los filtros de búsqueda"
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {torneos.map((t) => (
            <TorneoCard key={t.id} torneo={t} />
          ))}
        </div>
      )}

      {/* Paginación */}
      {totalPages > 1 && (
        <div className="flex justify-center gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={page === 1}
            onClick={() => setPage((p) => p - 1)}
          >
            Anterior
          </Button>
          <span className="flex items-center px-3 text-sm text-muted-foreground">
            {page} / {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={page === totalPages}
            onClick={() => setPage((p) => p + 1)}
          >
            Siguiente
          </Button>
        </div>
      )}
    </div>
  );
}

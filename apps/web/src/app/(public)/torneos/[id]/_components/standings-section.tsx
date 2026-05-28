'use client';

import { useQuery } from '@tanstack/react-query';
import { TrophyIcon } from 'lucide-react';
import { Avatar } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import api from '@/lib/api';

interface Standing {
  posicion: number;
  jugador: { id: string; nombre: string; avatar: string | null };
  puntos: number;
  victoriasLimpias: number;
}

export function StandingsSection({ torneoId }: { torneoId: string }) {
  const { data, isLoading } = useQuery({
    queryKey: ['standings', torneoId],
    queryFn: async () => {
      const res = await api.get<Standing[]>(`/torneos/${torneoId}/standings`);
      return res.data;
    },
  });

  if (isLoading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-12 w-full rounded-lg" />
        ))}
      </div>
    );
  }

  if (!data?.length) return null;

  return (
    <div className="space-y-3">
      <h2 className="font-heading font-semibold flex items-center gap-2">
        <TrophyIcon className="size-4 text-gold" />
        Clasificación final
      </h2>
      <div className="space-y-2">
        {data.map((s) => (
          <div
            key={s.jugador.id}
            className={`flex items-center gap-3 rounded-lg border px-4 py-3 ${
              s.posicion === 1
                ? 'border-gold/30 bg-gold/10'
                : s.posicion === 2
                ? 'border-silver/30 bg-silver/10'
                : s.posicion === 3
                ? 'border-bronze/30 bg-bronze/10'
                : 'border-border bg-card'
            }`}
          >
            <span
              className={`w-7 text-center text-sm font-bold ${
                s.posicion === 1
                  ? 'text-gold'
                  : s.posicion === 2
                  ? 'text-silver'
                  : s.posicion === 3
                  ? 'text-bronze'
                  : 'text-muted-foreground'
              }`}
            >
              {s.posicion}°
            </span>
            <Avatar src={s.jugador.avatar} name={s.jugador.nombre} size="sm" />
            <span className="flex-1 text-sm font-medium">{s.jugador.nombre}</span>
            <div className="text-right">
              <p className="text-sm font-bold">{s.puntos} pts</p>
              <p className="text-xs text-muted-foreground">{s.victoriasLimpias}V</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

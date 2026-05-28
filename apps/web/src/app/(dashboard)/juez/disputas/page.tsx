'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { AlertTriangleIcon, CheckCircleIcon, ExternalLinkIcon } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Avatar } from '@/components/ui/avatar';
import api from '@/lib/api';
import { toast } from '@/hooks/use-toast';
import { formatDate } from '@/lib/utils';
import type { DisputaStatus } from '@/types';

interface Disputa {
  id: string;
  status: DisputaStatus;
  escalada: boolean;
  createdAt: string;
  partida: {
    id: string;
    jugador1: { id: string; nombre: string; avatar: string | null };
    jugador2: { id: string; nombre: string; avatar: string | null };
    ronda: { numero: number; torneo: { id: string; nombre: string } };
  };
  resultado: {
    ganadorId: string | null;
    evidenciaUrl: string | null;
  };
  resolvedBy?: string | null;
}

export default function DisputasPage() {
  const qc = useQueryClient();
  const [selected, setSelected] = useState<Disputa | null>(null);
  const [ganadorId, setGanadorId] = useState('');
  const [notas, setNotas] = useState('');
  const [tab, setTab] = useState<'ABIERTA' | 'RESUELTA'>('ABIERTA');

  const { data: disputas, isLoading } = useQuery<Disputa[]>({
    queryKey: ['juez-disputas', tab],
    queryFn: async () => {
      const res = await api.get<Disputa[]>(`/disputas?status=${tab}`);
      return res.data;
    },
    refetchInterval: 30_000,
  });

  const resolverMutation = useMutation({
    mutationFn: ({ id, ganadorId, notas }: { id: string; ganadorId: string; notas: string }) =>
      api.patch(`/disputas/${id}/resolver`, { ganadorId, notas }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['juez-disputas'] });
      setSelected(null);
      setGanadorId('');
      setNotas('');
      toast({ title: 'Disputa resuelta' });
    },
    onError: () => toast({ title: 'Error al resolver la disputa', variant: 'destructive' }),
  });

  const escalarMutation = useMutation({
    mutationFn: (id: string) => api.patch(`/disputas/${id}/escalar`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['juez-disputas'] });
      setSelected(null);
      toast({ title: 'Disputa escalada al admin' });
    },
  });

  const pendientes = disputas?.filter((d) => d.status === 'ABIERTA') ?? [];
  const resueltas = disputas?.filter((d) => d.status === 'RESUELTA') ?? [];

  return (
    <div className="max-w-2xl space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-2xl font-bold">Disputas</h1>
          {pendientes.length > 0 && (
            <p className="text-sm text-amber-400">{pendientes.length} pendiente{pendientes.length !== 1 ? 's' : ''}</p>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-border">
        {([
          { key: 'ABIERTA', label: 'Abiertas' },
          { key: 'RESUELTA', label: 'Resueltas' },
        ] as const).map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`border-b-2 px-4 py-2 text-sm font-medium transition-colors ${
              tab === t.key
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-24 rounded-xl" />)}
        </div>
      ) : (disputas ?? []).length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-14 text-center">
            <CheckCircleIcon className="size-10 text-green-400/40" />
            <p className="text-sm text-muted-foreground">Sin disputas {tab === 'ABIERTA' ? 'pendientes' : 'resueltas'}</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {disputas!.map((disputa) => (
            <div
              key={disputa.id}
              className="rounded-xl border border-border bg-card px-4 py-3 space-y-2.5"
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-xs text-muted-foreground">
                    Ronda {disputa.partida.ronda.numero} ·{' '}
                    {disputa.partida.ronda.torneo.nombre}
                  </p>
                  <div className="mt-1.5 flex items-center gap-2">
                    <PlayerChip jugador={disputa.partida.jugador1} />
                    <span className="text-xs text-muted-foreground">vs</span>
                    <PlayerChip jugador={disputa.partida.jugador2} />
                  </div>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  {disputa.escalada && (
                    <Badge variant="outline" className="border-amber-500/30 bg-amber-500/10 text-amber-400">
                      Escalada
                    </Badge>
                  )}
                  {disputa.resultado.evidenciaUrl && (
                    <Button variant="ghost" size="icon" className="size-7" asChild>
                      <a href={disputa.resultado.evidenciaUrl} target="_blank" rel="noopener">
                        <ExternalLinkIcon className="size-3.5" />
                      </a>
                    </Button>
                  )}
                </div>
              </div>
              <p className="text-xs text-muted-foreground">{formatDate(disputa.createdAt)}</p>
              {disputa.status === 'ABIERTA' && (
                <div className="flex gap-2 pt-0.5">
                  <Button size="sm" onClick={() => setSelected(disputa)}>
                    Resolver disputa
                  </Button>
                  {!disputa.escalada && (
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-amber-400 hover:text-amber-400"
                      onClick={() => escalarMutation.mutate(disputa.id)}
                      disabled={escalarMutation.isPending}
                    >
                      Escalar a admin
                    </Button>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Resolver dialog */}
      <Dialog open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Resolver disputa</DialogTitle>
          </DialogHeader>
          {selected && (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Selecciona al ganador de la partida:
              </p>
              <div className="grid grid-cols-2 gap-2">
                {[selected.partida.jugador1, selected.partida.jugador2].map((j) => (
                  <label
                    key={j.id}
                    className={`flex cursor-pointer flex-col items-center gap-2 rounded-xl border p-3 transition-colors ${
                      ganadorId === j.id
                        ? 'border-primary bg-primary/10'
                        : 'border-border hover:border-border/80'
                    }`}
                  >
                    <input
                      type="radio"
                      name="ganador"
                      value={j.id}
                      checked={ganadorId === j.id}
                      onChange={() => setGanadorId(j.id)}
                      className="sr-only"
                    />
                    <Avatar src={j.avatar ?? undefined} name={j.nombre} className="size-10" />
                    <span className="text-center text-sm font-medium">{j.nombre}</span>
                  </label>
                ))}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="notas">Notas del fallo</Label>
                <Textarea
                  id="notas"
                  placeholder="Describe el motivo de la decisión…"
                  rows={3}
                  value={notas}
                  onChange={(e) => setNotas(e.target.value)}
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setSelected(null)}>Cancelar</Button>
            <Button
              disabled={!ganadorId || resolverMutation.isPending}
              onClick={() =>
                selected &&
                resolverMutation.mutate({ id: selected.id, ganadorId, notas })
              }
            >
              {resolverMutation.isPending ? 'Resolviendo…' : 'Confirmar fallo'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function PlayerChip({ jugador }: { jugador: { nombre: string; avatar: string | null } }) {
  return (
    <div className="flex items-center gap-1.5">
      <Avatar src={jugador.avatar ?? undefined} name={jugador.nombre} className="size-5" />
      <span className="text-sm font-medium">{jugador.nombre}</span>
    </div>
  );
}

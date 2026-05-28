'use client';

import { use, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  PlayIcon,
  CheckIcon,
  ClockIcon,
  ArrowRightIcon,
  SwordsIcon,
  TrophyIcon,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Avatar } from '@/components/ui/avatar';
import api from '@/lib/api';
import { toast } from '@/hooks/use-toast';
import type { PartidaStatus } from '@/types';

interface Ronda {
  id: string;
  numero: number;
  status: 'PENDIENTE' | 'EN_CURSO' | 'FINALIZADA';
  iniciadoAt: string | null;
  finalizadoAt: string | null;
  partidas: PartidaResumen[];
}

interface PartidaResumen {
  id: string;
  status: PartidaStatus;
  jugador1: { id: string; nombre: string; avatar: string | null };
  jugador2: { id: string; nombre: string; avatar: string | null } | null;
  resultado?: {
    ganador: { id: string; nombre: string } | null;
    jugador1Wins: number;
    jugador2Wins: number;
  } | null;
}

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function RondasPage({ params }: PageProps) {
  const { id: torneoId } = use(params);
  const qc = useQueryClient();
  const [confirmarSiguiente, setConfirmarSiguiente] = useState(false);
  const [confirmarCerrar, setConfirmarCerrar] = useState<string | null>(null);

  const { data: rondas, isLoading } = useQuery<Ronda[]>({
    queryKey: ['rondas', torneoId],
    queryFn: async () => {
      const res = await api.get<Ronda[]>(`/rondas/torneo/${torneoId}`);
      return res.data;
    },
    refetchInterval: 30_000,
  });

  const iniciarMutation = useMutation({
    mutationFn: (rondaId: string) => api.post(`/rondas/${rondaId}/iniciar`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['rondas', torneoId] });
      toast({ title: 'Ronda iniciada' });
    },
    onError: () => toast({ title: 'Error al iniciar ronda', variant: 'destructive' }),
  });

  const cerrarMutation = useMutation({
    mutationFn: (rondaId: string) => api.post(`/rondas/${rondaId}/cerrar`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['rondas', torneoId] });
      setConfirmarCerrar(null);
      toast({ title: 'Ronda cerrada' });
    },
    onError: () => toast({ title: 'Error al cerrar ronda', variant: 'destructive' }),
  });

  const siguienteMutation = useMutation({
    mutationFn: () => api.post(`/rondas/torneo/${torneoId}/siguiente`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['rondas', torneoId] });
      setConfirmarSiguiente(false);
      toast({ title: 'Nueva ronda generada' });
    },
    onError: () => toast({ title: 'Error al generar siguiente ronda', variant: 'destructive' }),
  });

  const rondaActual = rondas?.find((r) => r.status === 'EN_CURSO');
  const rondaPendiente = rondas?.find((r) => r.status === 'PENDIENTE');
  const todasFinalizadas = rondas?.every((r) => r.status === 'FINALIZADA') && (rondas?.length ?? 0) > 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-2xl font-bold">Gestión de rondas</h1>
          <p className="text-sm text-muted-foreground">Controla el avance del torneo</p>
        </div>
        <div className="flex gap-2">
          {rondaPendiente && (
            <Button
              size="sm"
              onClick={() => iniciarMutation.mutate(rondaPendiente.id)}
              disabled={iniciarMutation.isPending}
            >
              <PlayIcon className="mr-1 size-4" />
              Iniciar ronda {rondaPendiente.numero}
            </Button>
          )}
          {rondaActual && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => setConfirmarCerrar(rondaActual.id)}
            >
              <CheckIcon className="mr-1 size-4" />
              Cerrar ronda {rondaActual.numero}
            </Button>
          )}
          {todasFinalizadas && (
            <Button
              size="sm"
              onClick={() => setConfirmarSiguiente(true)}
              disabled={siguienteMutation.isPending}
            >
              <ArrowRightIcon className="mr-1 size-4" />
              Siguiente ronda
            </Button>
          )}
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2].map((i) => <Skeleton key={i} className="h-48 rounded-xl" />)}
        </div>
      ) : (rondas ?? []).length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-14 text-center">
            <SwordsIcon className="size-10 text-muted-foreground/30" />
            <p className="text-muted-foreground text-sm">
              Las rondas se generarán al iniciar el torneo
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {[...rondas!].reverse().map((ronda) => (
            <Card key={ronda.id} className={ronda.status === 'EN_CURSO' ? 'border-primary/30' : ''}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2 text-base">
                    Ronda {ronda.numero}
                    <RondaStatusBadge status={ronda.status} />
                  </CardTitle>
                  {ronda.iniciadoAt && (
                    <span className="flex items-center gap-1 text-xs text-muted-foreground">
                      <ClockIcon className="size-3" />
                      {new Date(ronda.iniciadoAt).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-2">
                {ronda.partidas.map((p) => (
                  <PartidaRow key={p.id} partida={p} />
                ))}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Confirmar cerrar ronda */}
      <Dialog open={!!confirmarCerrar} onOpenChange={(o) => !o && setConfirmarCerrar(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cerrar ronda</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Se cerrará la ronda actual. Las partidas sin resultado se marcarán como walkover automático.
            ¿Confirmas?
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmarCerrar(null)}>Cancelar</Button>
            <Button
              disabled={cerrarMutation.isPending}
              onClick={() => confirmarCerrar && cerrarMutation.mutate(confirmarCerrar)}
            >
              {cerrarMutation.isPending ? 'Cerrando…' : 'Cerrar ronda'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirmar siguiente ronda */}
      <Dialog open={confirmarSiguiente} onOpenChange={setConfirmarSiguiente}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Generar siguiente ronda</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Se generarán los emparejamientos para la siguiente ronda usando el sistema suizo.
            ¿Continuar?
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmarSiguiente(false)}>Cancelar</Button>
            <Button
              disabled={siguienteMutation.isPending}
              onClick={() => siguienteMutation.mutate()}
            >
              {siguienteMutation.isPending ? 'Generando…' : 'Generar ronda'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function RondaStatusBadge({ status }: { status: Ronda['status'] }) {
  const map = {
    PENDIENTE: { label: 'Pendiente', cls: 'border-muted-foreground/30 text-muted-foreground' },
    EN_CURSO: { label: 'En curso', cls: 'border-primary/40 bg-primary/10 text-primary' },
    FINALIZADA: { label: 'Finalizada', cls: 'border-green-500/30 bg-green-500/10 text-green-400' },
  };
  const { label, cls } = map[status];
  return <Badge variant="outline" className={cls}>{label}</Badge>;
}

function PartidaRow({ partida }: { partida: PartidaResumen }) {
  const statusColor: Record<PartidaStatus, string> = {
    PENDIENTE: 'text-muted-foreground',
    EN_CURSO: 'text-primary',
    COMPLETADA: 'text-green-400',
    DISPUTADA: 'text-amber-400',
    CANCELADA: 'text-muted-foreground',
  };

  return (
    <div className="flex items-center gap-2 rounded-lg border border-border bg-background px-3 py-2.5 text-sm">
      <div className="flex flex-1 items-center gap-2 min-w-0">
        <Avatar
          src={partida.jugador1.avatar ?? undefined}
          name={partida.jugador1.nombre}
          className="size-6"
        />
        <span className="truncate font-medium">{partida.jugador1.nombre}</span>
      </div>

      <div className="shrink-0 flex items-center gap-1.5 text-xs font-mono text-muted-foreground">
        {partida.resultado ? (
          <>
            <span className={partida.resultado.ganador?.id === partida.jugador1.id ? 'font-bold text-foreground' : ''}>
              {partida.resultado.jugador1Wins}
            </span>
            <span>-</span>
            <span className={partida.resultado.ganador?.id === partida.jugador2?.id ? 'font-bold text-foreground' : ''}>
              {partida.resultado.jugador2Wins}
            </span>
          </>
        ) : (
          <span className={statusColor[partida.status]}>
            {partida.status === 'PENDIENTE' ? 'vs' : partida.status === 'EN_CURSO' ? '⚡' : '—'}
          </span>
        )}
      </div>

      <div className="flex flex-1 items-center justify-end gap-2 min-w-0">
        {partida.jugador2 ? (
          <>
            <span className="truncate font-medium text-right">{partida.jugador2.nombre}</span>
            <Avatar
              src={partida.jugador2.avatar ?? undefined}
              name={partida.jugador2.nombre}
              className="size-6"
            />
          </>
        ) : (
          <span className="text-xs text-muted-foreground italic">BYE</span>
        )}
      </div>
    </div>
  );
}

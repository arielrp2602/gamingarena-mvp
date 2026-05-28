'use client';

import { use, useState } from 'react';
import Link from 'next/link';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  PlayIcon,
  XCircleIcon,
  CheckCircleIcon,
  SwordsIcon,
  FileTextIcon,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { TorneoStatusBadge } from '@/components/torneos/torneo-status-badge';
import { Avatar } from '@/components/ui/avatar';
import api from '@/lib/api';
import { formatDate } from '@/lib/utils';
import { toast } from '@/hooks/use-toast';
import type { Torneo, InscripcionStatus, DeckCheckStatus } from '@/types';

interface Inscripcion {
  id: string;
  status: InscripcionStatus;
  createdAt: string;
  jugador: { id: string; nombre: string; avatar: string | null; ciudad: string };
  deckCheck?: { id: string; status: DeckCheckStatus } | null;
  pago?: { status: string } | null;
}

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function GestionarTorneoPage({ params }: PageProps) {
  const { id } = use(params);
  const qc = useQueryClient();
  const [activeTab, setActiveTab] = useState('inscritos');
  const [expulsarId, setExpulsarId] = useState<string | null>(null);
  const [deckCheckModal, setDeckCheckModal] = useState<{ id: string; jugador: string } | null>(null);

  const { data: torneo, isLoading: torneoLoading } = useQuery<Torneo>({
    queryKey: ['torneo-tienda', id],
    queryFn: async () => {
      const res = await api.get<Torneo>(`/torneos/${id}`);
      return res.data;
    },
  });

  const { data: inscritos, isLoading: inscritosLoading } = useQuery<Inscripcion[]>({
    queryKey: ['inscritos', id],
    queryFn: async () => {
      const res = await api.get<{ data: Inscripcion[] }>(`/inscripciones/torneo/${id}`);
      return res.data.data;
    },
    refetchInterval: 30_000,
  });

  const iniciarMutation = useMutation({
    mutationFn: () => api.patch(`/torneos/${id}/iniciar`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['torneo-tienda', id] });
      toast({ title: 'Torneo iniciado' });
    },
    onError: () => toast({ title: 'Error al iniciar', variant: 'destructive' }),
  });

  const expulsarMutation = useMutation({
    mutationFn: (inscripcionId: string) => api.patch(`/inscripciones/${inscripcionId}/expulsar`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['inscritos', id] });
      setExpulsarId(null);
      toast({ title: 'Jugador expulsado' });
    },
  });

  const deckCheckMutation = useMutation({
    mutationFn: ({ deckCheckId, accion }: { deckCheckId: string; accion: 'aprobar' | 'rechazar' }) =>
      api.patch(`/deck-check/${deckCheckId}/${accion}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['inscritos', id] });
      setDeckCheckModal(null);
      toast({ title: 'Deck check actualizado' });
    },
  });

  const confirmados = inscritos?.filter((i) => i.status === 'CONFIRMADA') ?? [];
  const pendientes = inscritos?.filter((i) => i.status === 'PENDIENTE') ?? [];
  const deckChecks = inscritos?.filter((i) => i.deckCheck?.status === 'PENDIENTE') ?? [];

  const canIniciar =
    torneo?.status === 'ABIERTO' && confirmados.length >= 4;

  return (
    <div className="space-y-6">
      {/* Header */}
      {torneoLoading ? (
        <Skeleton className="h-16 w-full rounded-xl" />
      ) : torneo ? (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs text-muted-foreground">{torneo.juego.nombre}</p>
            <h1 className="font-heading text-2xl font-bold">{torneo.nombre}</h1>
            <p className="text-sm text-muted-foreground">{formatDate(torneo.fechaInicio)}</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <TorneoStatusBadge status={torneo.status} />
            {torneo.status === 'ABIERTO' && (
              <Button
                size="sm"
                onClick={() => iniciarMutation.mutate()}
                disabled={!canIniciar || iniciarMutation.isPending}
              >
                <PlayIcon className="mr-1 size-4" />
                {iniciarMutation.isPending ? 'Iniciando…' : 'Iniciar torneo'}
              </Button>
            )}
            {torneo.status === 'EN_CURSO' && (
              <Button size="sm" variant="outline" asChild>
                <Link href={`/tienda/torneos/${id}/rondas`}>
                  <SwordsIcon className="mr-1 size-4" />
                  Gestionar rondas
                </Link>
              </Button>
            )}
          </div>
        </div>
      ) : null}

      {!canIniciar && torneo?.status === 'ABIERTO' && (
        <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-2.5 text-sm text-amber-400">
          Necesitas al menos 4 jugadores confirmados para iniciar. Actualmente: {confirmados.length}
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 border-b border-border">
        {[
          { key: 'inscritos', label: 'Inscritos', count: inscritos?.length ?? 0 },
          { key: 'deck-check', label: 'Deck checks', count: deckChecks.length },
        ].map((t) => (
          <button
            key={t.key}
            onClick={() => setActiveTab(t.key)}
            className={`flex items-center gap-1.5 border-b-2 px-4 py-2 text-sm font-medium transition-colors ${
              activeTab === t.key
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            {t.label}
            {t.count > 0 && (
              <span className="rounded-full bg-muted px-1.5 py-0.5 text-xs leading-none">
                {t.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Inscritos tab */}
      {activeTab === 'inscritos' && (
        <div className="space-y-3">
          {inscritosLoading ? (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => <Skeleton key={i} className="h-14 rounded-xl" />)}
            </div>
          ) : (inscritos ?? []).length === 0 ? (
            <Card>
              <CardContent className="py-10 text-center text-sm text-muted-foreground">
                Sin inscripciones aún
              </CardContent>
            </Card>
          ) : (
            <div className="divide-y divide-border rounded-xl border border-border bg-card overflow-hidden">
              {inscritos!.map((inscripcion) => (
                <div key={inscripcion.id} className="flex items-center gap-3 px-4 py-3">
                  <Avatar
                    src={inscripcion.jugador.avatar ?? undefined}
                    name={inscripcion.jugador.nombre}
                    className="size-8"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="truncate text-sm font-medium">{inscripcion.jugador.nombre}</p>
                    <p className="text-xs text-muted-foreground">{inscripcion.jugador.ciudad}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <InscripcionStatusBadge status={inscripcion.status} />
                    {inscripcion.status === 'CONFIRMADA' && torneo?.status === 'ABIERTO' && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-7 text-destructive hover:text-destructive"
                        onClick={() => setExpulsarId(inscripcion.id)}
                      >
                        <XCircleIcon className="size-3.5" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Deck checks tab */}
      {activeTab === 'deck-check' && (
        <div className="space-y-3">
          {deckChecks.length === 0 ? (
            <Card>
              <CardContent className="py-10 text-center text-sm text-muted-foreground">
                Sin deck checks pendientes
              </CardContent>
            </Card>
          ) : (
            <div className="divide-y divide-border rounded-xl border border-border bg-card overflow-hidden">
              {deckChecks.map((inscripcion) => (
                <div key={inscripcion.id} className="flex items-center gap-3 px-4 py-3">
                  <FileTextIcon className="size-5 text-muted-foreground shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="truncate text-sm font-medium">{inscripcion.jugador.nombre}</p>
                    <p className="text-xs text-muted-foreground">Deck check pendiente de revisión</p>
                  </div>
                  <div className="flex gap-1.5">
                    <Button
                      size="sm"
                      className="h-7 bg-green-500/20 text-green-400 hover:bg-green-500/30"
                      onClick={() =>
                        setDeckCheckModal({
                          id: inscripcion.deckCheck!.id,
                          jugador: inscripcion.jugador.nombre,
                        })
                      }
                    >
                      Revisar
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Expulsar dialog */}
      <Dialog open={!!expulsarId} onOpenChange={(o) => !o && setExpulsarId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Expulsar jugador</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            ¿Confirmas que quieres expulsar a este jugador del torneo? Su inscripción quedará marcada como EXPULSADO.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setExpulsarId(null)}>Cancelar</Button>
            <Button
              variant="destructive"
              disabled={expulsarMutation.isPending}
              onClick={() => expulsarId && expulsarMutation.mutate(expulsarId)}
            >
              Expulsar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Deck check review dialog */}
      <Dialog open={!!deckCheckModal} onOpenChange={(o) => !o && setDeckCheckModal(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Deck check — {deckCheckModal?.jugador}</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Revisa el mazo del jugador y marca si lo apruebas o rechazas.
          </p>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setDeckCheckModal(null)}>Cancelar</Button>
            <Button
              variant="destructive"
              disabled={deckCheckMutation.isPending}
              onClick={() =>
                deckCheckModal &&
                deckCheckMutation.mutate({ deckCheckId: deckCheckModal.id, accion: 'rechazar' })
              }
            >
              Rechazar
            </Button>
            <Button
              disabled={deckCheckMutation.isPending}
              onClick={() =>
                deckCheckModal &&
                deckCheckMutation.mutate({ deckCheckId: deckCheckModal.id, accion: 'aprobar' })
              }
            >
              <CheckCircleIcon className="mr-1 size-4" />
              Aprobar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function InscripcionStatusBadge({ status }: { status: InscripcionStatus }) {
  const map: Record<InscripcionStatus, { label: string; cls: string }> = {
    PENDIENTE: { label: 'Pendiente', cls: 'border-amber-500/30 bg-amber-500/10 text-amber-400' },
    CONFIRMADA: { label: 'Confirmado', cls: 'border-green-500/30 bg-green-500/10 text-green-400' },
    CANCELADA: { label: 'Cancelado', cls: 'border-muted-foreground/30 bg-muted/50 text-muted-foreground' },
    EXPULSADO: { label: 'Expulsado', cls: 'border-destructive/30 bg-destructive/10 text-destructive' },
  };
  const { label, cls } = map[status];
  return <Badge variant="outline" className={cls}>{label}</Badge>;
}

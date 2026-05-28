'use client';

import Link from 'next/link';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { TrophyIcon, CalendarDaysIcon, XCircleIcon } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { TorneoStatusBadge } from '@/components/torneos/torneo-status-badge';
import api from '@/lib/api';
import { formatDate, formatCurrency } from '@/lib/utils';
import type { InscripcionStatus, PaginatedResponse, Torneo } from '@/types';
import { useState } from 'react';
import { toast } from '@/hooks/use-toast';

interface Inscripcion {
  id: string;
  status: InscripcionStatus;
  createdAt: string;
  torneo: Torneo;
  pago?: { status: string; monto: number } | null;
}

const INSCRIPCION_STATUS_LABEL: Record<InscripcionStatus, string> = {
  PENDIENTE: 'Pendiente',
  CONFIRMADA: 'Confirmada',
  CANCELADA: 'Cancelada',
  EXPULSADO: 'Expulsado',
};

const INSCRIPCION_STATUS_VARIANT: Record<InscripcionStatus, 'default' | 'secondary' | 'outline' | 'destructive'> = {
  PENDIENTE: 'secondary',
  CONFIRMADA: 'default',
  CANCELADA: 'outline',
  EXPULSADO: 'destructive',
};

export default function MisTorneosPage() {
  const qc = useQueryClient();
  const [cancelId, setCancelId] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['mis-inscripciones'],
    queryFn: async () => {
      const res = await api.get<{ data: Inscripcion[]; total: number }>('/inscripciones/mias');
      return res.data;
    },
    staleTime: 30_000,
  });

  const cancelMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/inscripciones/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['mis-inscripciones'] });
      setCancelId(null);
      toast({ title: 'Inscripción cancelada', variant: 'default' });
    },
    onError: () => {
      toast({ title: 'No se pudo cancelar', variant: 'destructive' });
    },
  });

  const inscripciones = data?.data ?? [];

  const activas = inscripciones.filter((i) =>
    ['PENDIENTE', 'CONFIRMADA'].includes(i.status) &&
    ['ABIERTO', 'EN_CURSO'].includes(i.torneo.status)
  );
  const historial = inscripciones.filter((i) => !activas.includes(i));

  const inscripcionToCancel = inscripciones.find((i) => i.id === cancelId);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-bold">Mis inscripciones</h1>
        <p className="text-muted-foreground text-sm">
          Torneos en los que participas o has participado
        </p>
      </div>

      {/* Activas */}
      <section className="space-y-3">
        <h2 className="font-heading font-semibold">Torneos activos</h2>
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2].map((i) => <Skeleton key={i} className="h-24 rounded-xl" />)}
          </div>
        ) : activas.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center gap-3 py-10 text-center">
              <TrophyIcon className="size-10 text-muted-foreground/30" />
              <p className="text-muted-foreground text-sm">No tienes torneos activos</p>
              <Button asChild size="sm">
                <Link href="/torneos">Ver torneos disponibles</Link>
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {activas.map((inscripcion) => (
              <InscripcionCard
                key={inscripcion.id}
                inscripcion={inscripcion}
                onCancel={() => setCancelId(inscripcion.id)}
              />
            ))}
          </div>
        )}
      </section>

      {/* Historial */}
      {historial.length > 0 && (
        <section className="space-y-3">
          <h2 className="font-heading font-semibold text-muted-foreground">Historial</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {historial.map((inscripcion) => (
              <InscripcionCard key={inscripcion.id} inscripcion={inscripcion} />
            ))}
          </div>
        </section>
      )}

      {/* Cancel confirm dialog */}
      <Dialog open={!!cancelId} onOpenChange={(open) => !open && setCancelId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cancelar inscripción</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            ¿Confirmas que quieres cancelar tu inscripción a{' '}
            <span className="font-medium text-foreground">
              {inscripcionToCancel?.torneo.nombre}
            </span>
            ? Esta acción no se puede deshacer.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCancelId(null)}>
              No, conservar
            </Button>
            <Button
              variant="destructive"
              onClick={() => cancelId && cancelMutation.mutate(cancelId)}
              disabled={cancelMutation.isPending}
            >
              {cancelMutation.isPending ? 'Cancelando…' : 'Sí, cancelar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function InscripcionCard({
  inscripcion,
  onCancel,
}: {
  inscripcion: Inscripcion;
  onCancel?: () => void;
}) {
  const canCancel =
    inscripcion.status === 'CONFIRMADA' &&
    inscripcion.torneo.status === 'ABIERTO';

  return (
    <Card className="flex flex-col gap-0 overflow-hidden">
      <CardContent className="flex-1 flex items-start gap-3 pt-4">
        <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/15">
          <TrophyIcon className="size-5 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <Link
            href={`/torneos/${inscripcion.torneo.id}`}
            className="truncate text-sm font-medium hover:text-primary transition-colors"
          >
            {inscripcion.torneo.nombre}
          </Link>
          <p className="text-xs text-muted-foreground">
            {inscripcion.torneo.juego.nombre} · {inscripcion.torneo.tienda.nombre}
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            <TorneoStatusBadge status={inscripcion.torneo.status} />
            <Badge variant={INSCRIPCION_STATUS_VARIANT[inscripcion.status]}>
              {INSCRIPCION_STATUS_LABEL[inscripcion.status]}
            </Badge>
          </div>
        </div>
      </CardContent>
      <div className="flex items-center justify-between border-t border-border px-4 py-2.5">
        <span className="flex items-center gap-1 text-xs text-muted-foreground">
          <CalendarDaysIcon className="size-3" />
          {formatDate(inscripcion.torneo.fechaInicio)}
        </span>
        {canCancel && onCancel && (
          <Button
            variant="ghost"
            size="sm"
            className="h-6 text-xs text-destructive hover:text-destructive"
            onClick={onCancel}
          >
            <XCircleIcon className="mr-1 size-3" />
            Cancelar
          </Button>
        )}
      </div>
    </Card>
  );
}

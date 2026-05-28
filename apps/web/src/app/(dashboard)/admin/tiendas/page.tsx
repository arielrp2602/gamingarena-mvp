'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { StoreIcon, CheckCircleIcon, XCircleIcon, MapPinIcon, PhoneIcon } from 'lucide-react';
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
import type { VerificationStatus } from '@/types';

interface TiendaAdmin {
  id: string;
  nombre: string;
  descripcion: string | null;
  ciudad: string;
  telefono: string;
  logo: string | null;
  verificationStatus: VerificationStatus;
  user: { email: string };
  _count: { torneos: number };
}

const STATUS_BADGE: Record<VerificationStatus, { label: string; cls: string }> = {
  PENDIENTE: { label: 'Pendiente', cls: 'border-amber-500/30 bg-amber-500/10 text-amber-400' },
  VERIFICADO: { label: 'Verificada', cls: 'border-green-500/30 bg-green-500/10 text-green-400' },
  RECHAZADO: { label: 'Rechazada', cls: 'border-destructive/30 bg-destructive/10 text-destructive' },
};

export default function AdminTiendasPage() {
  const qc = useQueryClient();
  const [tab, setTab] = useState<VerificationStatus>('PENDIENTE');
  const [accion, setAccion] = useState<{ tienda: TiendaAdmin; tipo: 'aprobar' | 'rechazar' } | null>(null);
  const [motivo, setMotivo] = useState('');

  const { data: tiendas, isLoading } = useQuery<TiendaAdmin[]>({
    queryKey: ['admin-tiendas', tab],
    queryFn: async () => {
      const res = await api.get<TiendaAdmin[]>(`/tienda/todas?status=${tab}`);
      return res.data;
    },
  });

  const aprobarMutation = useMutation({
    mutationFn: (id: string) => api.patch(`/tienda/${id}/aprobar`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-tiendas'] });
      setAccion(null);
      toast({ title: 'Tienda aprobada' });
    },
    onError: () => toast({ title: 'Error al aprobar', variant: 'destructive' }),
  });

  const rechazarMutation = useMutation({
    mutationFn: ({ id, motivo }: { id: string; motivo: string }) =>
      api.patch(`/tienda/${id}/rechazar`, { motivo }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-tiendas'] });
      setAccion(null);
      setMotivo('');
      toast({ title: 'Tienda rechazada' });
    },
    onError: () => toast({ title: 'Error al rechazar', variant: 'destructive' }),
  });

  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-heading text-2xl font-bold">Verificación de tiendas</h1>
        <p className="text-sm text-muted-foreground">Revisa y aprueba las solicitudes de tiendas</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-border">
        {([
          { key: 'PENDIENTE', label: 'Pendientes' },
          { key: 'VERIFICADO', label: 'Verificadas' },
          { key: 'RECHAZADO', label: 'Rechazadas' },
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
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-28 rounded-xl" />)}
        </div>
      ) : (tiendas ?? []).length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-14 text-center">
            <StoreIcon className="size-10 text-muted-foreground/30" />
            <p className="text-sm text-muted-foreground">Sin tiendas {tab.toLowerCase()}</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {tiendas!.map((tienda) => {
            const badge = STATUS_BADGE[tienda.verificationStatus];
            return (
              <div
                key={tienda.id}
                className="rounded-xl border border-border bg-card px-4 py-4 space-y-3"
              >
                <div className="flex items-start gap-3">
                  <Avatar
                    src={tienda.logo ?? undefined}
                    name={tienda.nombre}
                    className="size-12 rounded-xl"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-medium">{tienda.nombre}</p>
                      <Badge variant="outline" className={badge.cls}>{badge.label}</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">{tienda.user.email}</p>
                    {tienda.descripcion && (
                      <p className="mt-1 text-sm text-muted-foreground line-clamp-2">{tienda.descripcion}</p>
                    )}
                    <div className="mt-2 flex flex-wrap gap-3 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <MapPinIcon className="size-3" /> {tienda.ciudad}
                      </span>
                      <span className="flex items-center gap-1">
                        <PhoneIcon className="size-3" /> {tienda.telefono}
                      </span>
                      <span>{tienda._count.torneos} torneos</span>
                    </div>
                  </div>
                </div>

                {tienda.verificationStatus === 'PENDIENTE' && (
                  <div className="flex gap-2 pt-1">
                    <Button
                      size="sm"
                      onClick={() => setAccion({ tienda, tipo: 'aprobar' })}
                    >
                      <CheckCircleIcon className="mr-1 size-3.5" />
                      Aprobar
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => setAccion({ tienda, tipo: 'rechazar' })}
                    >
                      <XCircleIcon className="mr-1 size-3.5" />
                      Rechazar
                    </Button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Confirm action dialog */}
      <Dialog open={!!accion} onOpenChange={(o) => !o && setAccion(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {accion?.tipo === 'aprobar' ? 'Aprobar tienda' : 'Rechazar tienda'}
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            {accion?.tipo === 'aprobar'
              ? `¿Confirmas que quieres aprobar a "${accion?.tienda.nombre}"? Recibirá un email de confirmación.`
              : `¿Por qué rechazas a "${accion?.tienda.nombre}"?`}
          </p>
          {accion?.tipo === 'rechazar' && (
            <div className="space-y-1.5">
              <Label htmlFor="motivo">Motivo del rechazo</Label>
              <Textarea
                id="motivo"
                placeholder="Explica el motivo para que la tienda pueda corregirlo…"
                rows={3}
                value={motivo}
                onChange={(e) => setMotivo(e.target.value)}
              />
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setAccion(null)}>Cancelar</Button>
            <Button
              variant={accion?.tipo === 'rechazar' ? 'destructive' : 'default'}
              disabled={
                (accion?.tipo === 'aprobar' ? aprobarMutation : rechazarMutation).isPending ||
                (accion?.tipo === 'rechazar' && !motivo.trim())
              }
              onClick={() => {
                if (!accion) return;
                if (accion.tipo === 'aprobar') {
                  aprobarMutation.mutate(accion.tienda.id);
                } else {
                  rechazarMutation.mutate({ id: accion.tienda.id, motivo });
                }
              }}
            >
              {accion?.tipo === 'aprobar' ? 'Sí, aprobar' : 'Rechazar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

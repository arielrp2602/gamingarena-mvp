'use client';

import { BellIcon, CheckCheckIcon, ExternalLinkIcon } from 'lucide-react';
import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useNotificaciones } from '@/hooks/use-notificaciones';
import { cn } from '@/lib/utils';

const TIPO_COLORS: Record<string, string> = {
  PARTIDA_ASIGNADA: 'bg-primary/15 text-primary',
  RESULTADO_REPORTADO: 'bg-cyan-500/15 text-cyan-400',
  DISPUTA_CREADA: 'bg-amber-500/15 text-amber-400',
  DISPUTA_RESUELTA: 'bg-green-500/15 text-green-400',
  TORNEO_INICIADO: 'bg-primary/15 text-primary',
  INSCRIPCION_CONFIRMADA: 'bg-green-500/15 text-green-400',
  DECK_CHECK_RECHAZADO: 'bg-destructive/15 text-destructive',
  INFO: 'bg-muted text-muted-foreground',
};

function timeAgo(dateStr: string) {
  const diff = (Date.now() - new Date(dateStr).getTime()) / 1000;
  if (diff < 60) return 'Ahora';
  if (diff < 3600) return `${Math.floor(diff / 60)} min`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} h`;
  return `${Math.floor(diff / 86400)} d`;
}

export default function NotificacionesPage() {
  const { notificaciones, unread, isLoading, markRead, markAllRead } = useNotificaciones();

  return (
    <div className="max-w-2xl space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-2xl font-bold">Notificaciones</h1>
          {unread > 0 && (
            <p className="text-sm text-muted-foreground">{unread} sin leer</p>
          )}
        </div>
        {unread > 0 && (
          <Button variant="ghost" size="sm" onClick={markAllRead} className="gap-1.5">
            <CheckCheckIcon className="size-4" />
            Marcar todas como leídas
          </Button>
        )}
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-16 rounded-xl" />
          ))}
        </div>
      ) : notificaciones.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-14 text-center">
            <BellIcon className="size-10 text-muted-foreground/30" />
            <p className="text-muted-foreground text-sm">Sin notificaciones</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-1.5">
          {notificaciones.map((n) => {
            const colorClass = TIPO_COLORS[n.tipo] ?? TIPO_COLORS.INFO;
            return (
              <div
                key={n.id}
                className={cn(
                  'flex items-start gap-3 rounded-xl border border-border bg-card px-4 py-3 transition-colors',
                  !n.leida && 'border-primary/20 bg-primary/5',
                )}
              >
                <div className={cn('mt-0.5 size-8 shrink-0 rounded-full flex items-center justify-center text-xs font-bold', colorClass)}>
                  <BellIcon className="size-3.5" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className={cn('text-sm', !n.leida ? 'font-medium' : 'text-muted-foreground')}>
                    {n.mensaje}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">{timeAgo(n.createdAt)}</p>
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  {n.link && (
                    <Button variant="ghost" size="icon" className="size-7" asChild>
                      <Link href={n.link}>
                        <ExternalLinkIcon className="size-3.5" />
                      </Link>
                    </Button>
                  )}
                  {!n.leida && (
                    <button
                      onClick={() => markRead(n.id)}
                      className="size-2 shrink-0 rounded-full bg-primary"
                      title="Marcar como leída"
                    />
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

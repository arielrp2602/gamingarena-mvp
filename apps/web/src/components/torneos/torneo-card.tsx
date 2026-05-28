import Link from 'next/link';
import Image from 'next/image';
import { CalendarIcon, MapPinIcon, UsersIcon, TrophyIcon } from 'lucide-react';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { TorneoStatusBadge, TorneoTipoBadge } from './torneo-status-badge';
import { formatDate, formatCurrency } from '@/lib/utils';
import type { Torneo } from '@/types';

interface TorneoCardProps {
  torneo: Torneo;
}

export function TorneoCard({ torneo }: TorneoCardProps) {
  const ocupado = torneo._count?.inscripciones ?? 0;
  const pct = Math.round((ocupado / torneo.cupoMaximo) * 100);

  return (
    <Card className="overflow-hidden transition-all duration-200 hover:glow-purple-sm hover:border-primary/30">
      {/* Banner */}
      <div className="relative h-36 w-full bg-gradient-to-br from-primary/20 via-background to-cyan-500/10">
        {torneo.bannerUrl ? (
          <Image
            src={torneo.bannerUrl}
            alt={torneo.nombre}
            fill
            className="object-cover opacity-60"
          />
        ) : (
          <div className="flex h-full items-center justify-center">
            <TrophyIcon className="size-12 text-primary/30" />
          </div>
        )}
        {/* Badges superpuestos */}
        <div className="absolute left-2 top-2 flex gap-1.5">
          <TorneoStatusBadge status={torneo.status} />
          <TorneoTipoBadge tipo={torneo.tipoTorneo} />
        </div>
        {/* Juego icon */}
        {torneo.juego.iconoUrl && (
          <div className="absolute right-2 top-2 size-8 overflow-hidden rounded-lg border border-border bg-background/80">
            <Image
              src={torneo.juego.iconoUrl}
              alt={torneo.juego.nombre}
              width={32}
              height={32}
              className="object-cover"
            />
          </div>
        )}
      </div>

      <CardContent className="pt-3">
        <div className="space-y-2">
          <div>
            <p className="text-xs font-medium text-muted-foreground">{torneo.juego.nombre}</p>
            <h3 className="font-heading text-base font-semibold leading-tight">
              {torneo.nombre}
            </h3>
          </div>

          <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs text-muted-foreground">
            <div className="flex items-center gap-1.5">
              <CalendarIcon className="size-3.5 shrink-0" />
              <span>{formatDate(torneo.fechaInicio)}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <MapPinIcon className="size-3.5 shrink-0" />
              <span className="truncate">{torneo.tienda.ciudad}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <UsersIcon className="size-3.5 shrink-0" />
              <span>
                {ocupado}/{torneo.cupoMaximo}
                <span
                  className="ml-1 inline-block h-1.5 w-10 rounded-full bg-muted align-middle"
                >
                  <span
                    className="block h-full rounded-full bg-primary transition-all"
                    style={{ width: `${pct}%` }}
                  />
                </span>
              </span>
            </div>
            <div className="flex items-center gap-1.5 font-medium text-foreground">
              {torneo.tipoTorneo === 'CASUAL' ? (
                <span className="text-cyan-400">Gratuito</span>
              ) : (
                <span>{formatCurrency(torneo.inscripcionPrecio ?? 0)}</span>
              )}
            </div>
          </div>

          <p className="text-xs text-muted-foreground">{torneo.tienda.nombre}</p>
        </div>
      </CardContent>

      <CardFooter className="pt-0">
        <Button asChild size="sm" className="w-full">
          <Link href={`/torneos/${torneo.id}`}>
            {torneo.status === 'ABIERTO' ? 'Ver e inscribirse' : 'Ver torneo'}
          </Link>
        </Button>
      </CardFooter>
    </Card>
  );
}

import { notFound } from 'next/navigation';
import Image from 'next/image';
import {
  CalendarIcon,
  UsersIcon,
  MapPinIcon,
  TrophyIcon,
  ClockIcon,
  ShieldCheckIcon,
  FileTextIcon,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { TorneoStatusBadge, TorneoTipoBadge } from '@/components/torneos/torneo-status-badge';
import { InscripcionButton } from './_components/inscripcion-button';
import { StandingsSection } from './_components/standings-section';
import { serverFetch } from '@/lib/server-api';
import { formatDate, formatCurrency } from '@/lib/utils';
import type { Torneo } from '@/types';

interface PageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: PageProps) {
  const { id } = await params;
  try {
    const torneo = await serverFetch<Torneo>(`/torneos/${id}`);
    return { title: torneo.nombre };
  } catch {
    return { title: 'Torneo' };
  }
}

export default async function TorneoDetailPage({ params }: PageProps) {
  const { id } = await params;

  let torneo: Torneo;
  try {
    torneo = await serverFetch<Torneo>(`/torneos/${id}`);
  } catch {
    notFound();
  }

  const inscritos = torneo._count?.inscripciones ?? 0;
  const cuposLibres = torneo.cupoMaximo - inscritos;

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      {/* Banner */}
      <div className="relative mb-6 h-48 w-full overflow-hidden rounded-2xl bg-gradient-to-br from-primary/20 via-background to-cyan-500/10 md:h-64">
        {torneo.bannerUrl ? (
          <Image
            src={torneo.bannerUrl}
            alt={torneo.nombre}
            fill
            className="object-cover opacity-70"
          />
        ) : (
          <div className="flex h-full items-center justify-center">
            <TrophyIcon className="size-16 text-primary/20" />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-background/80 to-transparent" />
        <div className="absolute bottom-4 left-4 flex gap-2">
          <TorneoStatusBadge status={torneo.status} />
          <TorneoTipoBadge tipo={torneo.tipoTorneo} />
        </div>
      </div>

      <div className="grid gap-8 lg:grid-cols-[1fr_320px]">
        {/* Main */}
        <div className="space-y-6">
          <div>
            <p className="text-sm font-medium text-primary">{torneo.juego.nombre}</p>
            <h1 className="font-heading text-3xl font-bold">{torneo.nombre}</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Organizado por <span className="font-medium text-foreground">{torneo.tienda.nombre}</span>
            </p>
          </div>

          {torneo.descripcion && (
            <p className="text-muted-foreground leading-relaxed">{torneo.descripcion}</p>
          )}

          {/* Info grid */}
          <div className="grid grid-cols-2 gap-4 rounded-xl border border-border bg-card p-4 sm:grid-cols-3">
            <div className="flex flex-col gap-0.5">
              <span className="text-xs text-muted-foreground flex items-center gap-1">
                <CalendarIcon className="size-3" /> Fecha
              </span>
              <span className="text-sm font-medium">{formatDate(torneo.fechaInicio)}</span>
            </div>
            <div className="flex flex-col gap-0.5">
              <span className="text-xs text-muted-foreground flex items-center gap-1">
                <MapPinIcon className="size-3" /> Ciudad
              </span>
              <span className="text-sm font-medium">{torneo.tienda.ciudad}</span>
            </div>
            <div className="flex flex-col gap-0.5">
              <span className="text-xs text-muted-foreground flex items-center gap-1">
                <UsersIcon className="size-3" /> Cupo
              </span>
              <span className="text-sm font-medium">
                {inscritos}/{torneo.cupoMaximo} inscritos
              </span>
            </div>
            {torneo.tiempoPorRondaMinutos && (
              <div className="flex flex-col gap-0.5">
                <span className="text-xs text-muted-foreground flex items-center gap-1">
                  <ClockIcon className="size-3" /> Por ronda
                </span>
                <span className="text-sm font-medium">{torneo.tiempoPorRondaMinutos} min</span>
              </div>
            )}
            {torneo.juezRequerido && (
              <div className="flex flex-col gap-0.5">
                <span className="text-xs text-muted-foreground flex items-center gap-1">
                  <ShieldCheckIcon className="size-3" /> Árbitro
                </span>
                <span className="text-sm font-medium text-success">Incluido</span>
              </div>
            )}
            {torneo.deckListObligatoria && (
              <div className="flex flex-col gap-0.5">
                <span className="text-xs text-muted-foreground flex items-center gap-1">
                  <FileTextIcon className="size-3" /> Decklist
                </span>
                <span className="text-sm font-medium">Obligatoria</span>
              </div>
            )}
          </div>

          {/* Reglas */}
          {torneo.reglasPartida && torneo.reglasPartida.length > 0 && (
            <div className="space-y-2">
              <h2 className="font-heading font-semibold">Reglas de la partida</h2>
              <ul className="space-y-1.5">
                {torneo.reglasPartida.map((r, i) => (
                  <li key={i} className="flex gap-2 text-sm text-muted-foreground">
                    <span className="mt-0.5 size-5 shrink-0 rounded-full bg-primary/20 text-[11px] font-bold text-primary flex items-center justify-center">
                      {i + 1}
                    </span>
                    {r}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Premios */}
          {torneo.premios && torneo.premios.length > 0 && (
            <div className="space-y-2">
              <h2 className="font-heading font-semibold">Premios</h2>
              <div className="space-y-2">
                {torneo.premios.map((p) => (
                  <div
                    key={p.id}
                    className="flex items-center gap-3 rounded-lg border border-border bg-card px-4 py-3"
                  >
                    <span className="size-7 shrink-0 rounded-full bg-primary/20 text-sm font-bold text-primary flex items-center justify-center">
                      {p.posicion}°
                    </span>
                    <span className="flex-1 text-sm font-medium">{p.descripcion}</span>
                    {p.monto && (
                      <Badge variant="outline" className="border-gold/30 bg-gold/10 text-gold">
                        {formatCurrency(p.monto)}
                      </Badge>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Standings si finalizado */}
          {torneo.status === 'FINALIZADO' && (
            <StandingsSection torneoId={torneo.id} />
          )}
        </div>

        {/* Sidebar sticky */}
        <div className="lg:sticky lg:top-20 space-y-4">
          {/* Precio */}
          <div className="rounded-xl border border-border bg-card p-4 space-y-3">
            <div className="text-center">
              <p className="text-3xl font-bold text-gradient-purple">
                {torneo.tipoTorneo === 'CASUAL'
                  ? 'Gratuito'
                  : formatCurrency(torneo.inscripcionPrecio ?? 0)}
              </p>
              <p className="text-sm text-muted-foreground">Precio de inscripción</p>
            </div>

            <Separator />

            <div className="space-y-1 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Cupos disponibles</span>
                <span className={cuposLibres === 0 ? 'text-destructive font-medium' : 'font-medium'}>
                  {cuposLibres === 0 ? 'Lleno' : cuposLibres}
                </span>
              </div>
              <div className="h-1.5 w-full rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-primary transition-all"
                  style={{ width: `${Math.min((inscritos / torneo.cupoMaximo) * 100, 100)}%` }}
                />
              </div>
            </div>

            <InscripcionButton torneo={torneo} />
          </div>

          {/* Formato */}
          {torneo.formatoTienda?.formatoJuego && (
            <div className="rounded-xl border border-border bg-card px-4 py-3">
              <p className="text-xs text-muted-foreground">Formato</p>
              <p className="font-medium">{torneo.formatoTienda.formatoJuego.nombre}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

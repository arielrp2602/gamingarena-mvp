import Link from 'next/link';
import Image from 'next/image';
import { TrophyIcon, ZapIcon, ShieldCheckIcon, UsersIcon, ArrowRightIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { TorneoCard } from '@/components/torneos/torneo-card';
import { serverFetch } from '@/lib/server-api';
import type { Torneo, PaginatedResponse } from '@/types';

async function getTorneosDestacados() {
  try {
    const res = await serverFetch<PaginatedResponse<Torneo>>(
      '/torneos?status=ABIERTO&perPage=6',
    );
    return res.data;
  } catch {
    return [];
  }
}

const JUEGOS = [
  { nombre: 'Yu-Gi-Oh!', emoji: '🃏', color: 'from-purple-500/20 to-purple-900/10' },
  { nombre: 'Magic', emoji: '⚡', color: 'from-blue-500/20 to-blue-900/10' },
  { nombre: 'Pokémon TCG', emoji: '🔴', color: 'from-red-500/20 to-red-900/10' },
  { nombre: 'Smash Bros', emoji: '🎮', color: 'from-yellow-500/20 to-yellow-900/10' },
  { nombre: 'Valorant', emoji: '🔫', color: 'from-pink-500/20 to-pink-900/10' },
  { nombre: 'FIFA', emoji: '⚽', color: 'from-green-500/20 to-green-900/10' },
];

const FEATURES = [
  {
    icon: TrophyIcon,
    title: 'Torneos Swiss',
    desc: 'Sistema de brackets Swiss automático. Emparejamiento inteligente, sin rematches.',
    color: 'text-gold',
  },
  {
    icon: ZapIcon,
    title: 'Pagos integrados',
    desc: 'Inscripciones con Stripe. Reembolso automático si el torneo se cancela.',
    color: 'text-info',
  },
  {
    icon: ShieldCheckIcon,
    title: 'Jueces certificados',
    desc: 'Resolución de disputas por jueces oficiales. Cada partida tiene árbitro.',
    color: 'text-success',
  },
  {
    icon: UsersIcon,
    title: 'Comunidad activa',
    desc: 'Perfiles de jugador, ranking nacional, historial de torneos.',
    color: 'text-gaming-purple',
  },
];

export default async function LandingPage() {
  const torneos = await getTorneosDestacados();

  return (
    <>
      {/* Hero */}
      <section className="relative flex min-h-[calc(100vh-3.5rem)] flex-col items-center justify-center overflow-hidden px-4 text-center">
        {/* Background glow */}
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <div className="size-[600px] rounded-full bg-primary/10 blur-[100px]" />
        </div>

        <div className="relative z-10 max-w-3xl space-y-6">
          <Badge variant="outline" className="border-primary/40 bg-primary/10 text-primary">
            🎮 Plataforma #1 de torneos TCG en México
          </Badge>

          <h1 className="font-heading text-4xl font-bold leading-tight tracking-tight sm:text-5xl lg:text-6xl">
            Compite en torneos
            <br />
            <span className="text-gradient-purple">desde donde quieras</span>
          </h1>

          <p className="mx-auto max-w-xl text-lg text-muted-foreground">
            Yu-Gi-Oh!, Magic, Pokémon, Smash Bros y más. Inscríbete, sube tu decklist,
            juega tus partidas. No olvides decirle a tu oponente "ez gg".
          </p>

          <div className="flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
            <Button size="lg" asChild className="glow-purple w-full sm:w-auto">
              <Link href="/torneos">
                Ver torneos activos
                <ArrowRightIcon className="ml-2 size-4" />
              </Link>
            </Button>
            <Button size="lg" variant="outline" asChild className="w-full sm:w-auto">
              <Link href="/register">Crear cuenta gratis</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Juegos soportados */}
      <section className="border-t border-border py-16 px-4">
        <div className="mx-auto max-w-5xl">
          <h2 className="mb-8 text-center font-heading text-2xl font-bold">
            Juegos disponibles
          </h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-6">
            {JUEGOS.map((j) => (
              <div
                key={j.nombre}
                className={`flex flex-col items-center gap-2 rounded-xl bg-gradient-to-b ${j.color} border border-border p-4 text-center`}
              >
                <span className="text-3xl">{j.emoji}</span>
                <span className="text-xs font-medium text-muted-foreground">{j.nombre}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-16 px-4">
        <div className="mx-auto max-w-5xl">
          <h2 className="mb-10 text-center font-heading text-2xl font-bold">
            Todo lo que necesitas para competir
          </h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {FEATURES.map((f) => (
              <div
                key={f.title}
                className="flex flex-col gap-3 rounded-xl border border-border bg-card p-5"
              >
                <f.icon className={`size-8 ${f.color}`} />
                <div>
                  <h3 className="font-heading font-semibold">{f.title}</h3>
                  <p className="mt-1 text-sm text-muted-foreground">{f.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Torneos destacados */}
      {torneos.length > 0 && (
        <section className="py-16 px-4 border-t border-border">
          <div className="mx-auto max-w-5xl">
            <div className="mb-8 flex items-center justify-between">
              <h2 className="font-heading text-2xl font-bold">Torneos abiertos</h2>
              <Button variant="outline" size="sm" asChild>
                <Link href="/torneos">Ver todos</Link>
              </Button>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {torneos.map((t) => (
                <TorneoCard key={t.id} torneo={t} />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* CTA final */}
      <section className="relative overflow-hidden border-t border-border py-20 px-4 text-center">
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <div className="size-[400px] rounded-full bg-primary/5 blur-[80px]" />
        </div>
        <div className="relative mx-auto max-w-xl space-y-4">
          <h2 className="font-heading text-3xl font-bold">
            ¿Eres dueño de una tienda?
          </h2>
          <p className="text-muted-foreground">
            Crea torneos, gestiona inscripciones, cobra entry fees y distribuye premios.
            Obtén verificación oficial de GamingArena.
          </p>
          <Button size="lg" asChild>
            <Link href="/register">Registra tu tienda</Link>
          </Button>
        </div>
      </section>
    </>
  );
}

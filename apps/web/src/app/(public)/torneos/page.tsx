import { Suspense } from 'react';
import { TorneosListClient } from './_components/torneos-list-client';
import { serverFetch } from '@/lib/server-api';
import type { Juego, PaginatedResponse, Torneo } from '@/types';

export const metadata = { title: 'Torneos' };

async function getInitialData() {
  const [torneosRes, juegos] = await Promise.all([
    serverFetch<PaginatedResponse<Torneo>>('/torneos?page=1&perPage=12').catch(
      () => ({ data: [], total: 0, page: 1, perPage: 12, totalPages: 0 }),
    ),
    serverFetch<Juego[]>('/juegos').catch(() => []),
  ]);
  return { torneos: torneosRes, juegos };
}

export default async function TorneosPage() {
  const { torneos, juegos } = await getInitialData();

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <div className="mb-6">
        <h1 className="font-heading text-3xl font-bold">Torneos</h1>
        <p className="text-muted-foreground">
          Encuentra y únete a torneos de TCG y videojuegos
        </p>
      </div>
      <Suspense fallback={null}>
        <TorneosListClient initial={torneos} juegos={juegos} />
      </Suspense>
    </div>
  );
}

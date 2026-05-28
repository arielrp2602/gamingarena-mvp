'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import {
  StoreIcon,
  TrophyIcon,
  UsersIcon,
  MessageSquareIcon,
  ArrowRightIcon,
  AlertCircleIcon,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import api from '@/lib/api';

interface AdminStats {
  tiendasPendientes: number;
  tiendasVerificadas: number;
  totalTorneos: number;
  totalJugadores: number;
  feedbackPendiente: number;
}

export default function AdminPage() {
  const { data: stats, isLoading } = useQuery<AdminStats>({
    queryKey: ['admin-stats'],
    queryFn: async () => {
      const res = await api.get<AdminStats>('/admin/stats');
      return res.data;
    },
    refetchInterval: 60_000,
  });

  const items: {
    label: string;
    value?: number | string;
    icon: React.ReactNode;
    color: string;
    href: string;
    alert?: boolean;
  }[] = [
    {
      label: 'Tiendas pendientes',
      value: stats?.tiendasPendientes,
      icon: <StoreIcon className="size-5 text-warning" />,
      color: 'bg-warning/15',
      href: '/admin/tiendas',
      alert: (stats?.tiendasPendientes ?? 0) > 0,
    },
    {
      label: 'Tiendas verificadas',
      value: stats?.tiendasVerificadas,
      icon: <StoreIcon className="size-5 text-success" />,
      color: 'bg-success/15',
      href: '/admin/tiendas',
    },
    {
      label: 'Total torneos',
      value: stats?.totalTorneos,
      icon: <TrophyIcon className="size-5 text-primary" />,
      color: 'bg-primary/15',
      href: '/torneos',
    },
    {
      label: 'Jugadores registrados',
      value: stats?.totalJugadores,
      icon: <UsersIcon className="size-5 text-info" />,
      color: 'bg-info/15',
      href: '/admin/tiendas',
    },
    {
      label: 'Feedback pendiente',
      value: stats?.feedbackPendiente,
      icon: <MessageSquareIcon className="size-5 text-gaming-purple" />,
      color: 'bg-gaming-purple/15',
      href: '/admin/feedback',
      alert: (stats?.feedbackPendiente ?? 0) > 0,
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-bold">Panel de administración</h1>
        <p className="text-sm text-muted-foreground">Gestiona la plataforma GamingArena</p>
      </div>

      {/* Stats grid */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {isLoading
          ? Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-xl" />)
          : items.map((item) => (
              <Link key={item.label} href={item.href}>
                <Card size="sm" className={`transition-colors hover:border-primary/30 ${item.alert ? 'border-warning/30 bg-warning/5' : ''}`}>
                  <CardContent className="flex items-center gap-3">
                    <div className={`flex size-10 items-center justify-center rounded-xl ${item.color}`}>
                      {item.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-muted-foreground">{item.label}</p>
                      <p className="font-heading text-xl font-bold">{item.value ?? '—'}</p>
                    </div>
                    {item.alert && <AlertCircleIcon className="size-4 text-warning shrink-0" />}
                  </CardContent>
                </Card>
              </Link>
            ))}
      </div>

      {/* Quick links */}
      <div className="space-y-2">
        <h2 className="font-heading font-semibold">Acciones rápidas</h2>
        <div className="grid gap-2 sm:grid-cols-2">
          {[
            { href: '/admin/tiendas', label: 'Verificar tiendas', desc: 'Aprobar o rechazar solicitudes' },
            { href: '/admin/juegos', label: 'Catálogo de juegos', desc: 'Añadir/editar juegos y formatos' },
            { href: '/admin/feedback', label: 'Feedback de usuarios', desc: 'Revisar bugs y sugerencias' },
          ].map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="flex items-center justify-between rounded-xl border border-border bg-card px-4 py-3 hover:border-primary/30 hover:bg-primary/5 transition-colors"
            >
              <div>
                <p className="text-sm font-medium">{link.label}</p>
                <p className="text-xs text-muted-foreground">{link.desc}</p>
              </div>
              <ArrowRightIcon className="size-4 text-muted-foreground" />
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}

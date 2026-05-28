'use client';

import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { UserIcon, TrophyIcon, MapPinIcon, ShieldIcon } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Avatar } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuthStore } from '@/store/auth.store';
import api from '@/lib/api';
import { toast } from '@/hooks/use-toast';
import type { JugadorProfile } from '@/types';

const jugadorSchema = z.object({
  nombre: z.string().min(2, 'Mínimo 2 caracteres').max(60),
  ciudad: z.string().min(2, 'Ciudad requerida').max(60),
  avatar: z.string().url('URL inválida').optional().or(z.literal('')),
});

type JugadorForm = z.infer<typeof jugadorSchema>;

interface JugadorStats {
  profile: JugadorProfile;
  torneos: number;
  victorias: number;
  derrotas: number;
  rankingGlobal: number;
}

export default function PerfilPage() {
  const { user } = useAuthStore();
  const qc = useQueryClient();

  const { data: stats, isLoading } = useQuery<JugadorStats>({
    queryKey: ['jugador-profile'],
    queryFn: async () => {
      const res = await api.get<JugadorStats>('/jugador/profile');
      return res.data;
    },
    enabled: user?.activeRole === 'JUGADOR',
  });

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isDirty },
  } = useForm<JugadorForm>({
    resolver: zodResolver(jugadorSchema),
    defaultValues: { nombre: '', ciudad: '', avatar: '' },
  });

  useEffect(() => {
    if (stats?.profile) {
      reset({
        nombre: stats.profile.nombre,
        ciudad: stats.profile.ciudad,
        avatar: stats.profile.avatar ?? '',
      });
    }
  }, [stats, reset]);

  const updateMutation = useMutation({
    mutationFn: (data: JugadorForm) => api.patch('/jugador/profile', data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['jugador-profile'] });
      qc.invalidateQueries({ queryKey: ['auth-me'] });
      toast({ title: 'Perfil actualizado' });
    },
    onError: () => toast({ title: 'Error al guardar', variant: 'destructive' }),
  });

  if (user?.activeRole !== 'JUGADOR') {
    return (
      <div className="space-y-6">
        <h1 className="font-heading text-2xl font-bold">Mi perfil</h1>
        <Card>
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            Esta sección es solo para jugadores.
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="font-heading text-2xl font-bold">Mi perfil</h1>
        <p className="text-sm text-muted-foreground">Gestiona tu información pública</p>
      </div>

      {/* Stats row */}
      {isLoading ? (
        <div className="grid grid-cols-3 gap-3">
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-20 rounded-xl" />)}
        </div>
      ) : stats ? (
        <div className="grid grid-cols-3 gap-3">
          <StatCard label="Torneos" value={stats.torneos} icon={<TrophyIcon className="size-4 text-primary" />} />
          <StatCard label="Victorias" value={stats.victorias} icon={<ShieldIcon className="size-4 text-green-400" />} />
          <StatCard label="Ranking" value={`#${stats.rankingGlobal}`} icon={<UserIcon className="size-4 text-cyan-400" />} />
        </div>
      ) : null}

      {/* Edit form */}
      <Card>
        <CardHeader>
          <CardTitle>Información personal</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => <Skeleton key={i} className="h-10 rounded-lg" />)}
            </div>
          ) : (
            <form onSubmit={handleSubmit((d) => updateMutation.mutate(d))} className="space-y-4">
              <div className="flex items-center gap-4 mb-6">
                <Avatar
                  src={stats?.profile.avatar ?? undefined}
                  name={stats?.profile.nombre ?? user?.email}
                  className="size-16 text-lg"
                />
                <div>
                  <p className="font-medium">{stats?.profile.nombre}</p>
                  <p className="text-sm text-muted-foreground flex items-center gap-1">
                    <MapPinIcon className="size-3" />
                    {stats?.profile.ciudad}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">{user?.email}</p>
                </div>
              </div>

              <Separator />

              <div className="space-y-1.5">
                <Label htmlFor="nombre">Nombre de jugador</Label>
                <Input id="nombre" {...register('nombre')} />
                {errors.nombre && (
                  <p className="text-xs text-destructive">{errors.nombre.message}</p>
                )}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="ciudad">Ciudad</Label>
                <Input id="ciudad" {...register('ciudad')} placeholder="CDMX" />
                {errors.ciudad && (
                  <p className="text-xs text-destructive">{errors.ciudad.message}</p>
                )}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="avatar">URL de avatar</Label>
                <Input id="avatar" {...register('avatar')} placeholder="https://..." />
                {errors.avatar && (
                  <p className="text-xs text-destructive">{errors.avatar.message}</p>
                )}
              </div>

              <div className="flex items-center gap-3 pt-2">
                <Button
                  type="submit"
                  disabled={!isDirty || updateMutation.isPending}
                >
                  {updateMutation.isPending ? 'Guardando…' : 'Guardar cambios'}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  disabled={!isDirty}
                  onClick={() =>
                    reset({
                      nombre: stats?.profile.nombre ?? '',
                      ciudad: stats?.profile.ciudad ?? '',
                      avatar: stats?.profile.avatar ?? '',
                    })
                  }
                >
                  Descartar
                </Button>
              </div>
            </form>
          )}
        </CardContent>
      </Card>

      {/* Ranking info */}
      {stats && (
        <Card>
          <CardContent className="flex items-center justify-between py-4">
            <div>
              <p className="text-sm font-medium">Puntos de ranking</p>
              <p className="text-xs text-muted-foreground">Posición global basada en torneos COMPETITIVO</p>
            </div>
            <Badge variant="outline" className="border-primary/40 bg-primary/10 text-primary text-base px-3 py-1">
              {stats.profile.rankingPuntos} pts
            </Badge>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function StatCard({
  label,
  value,
  icon,
}: {
  label: string;
  value: string | number;
  icon: React.ReactNode;
}) {
  return (
    <Card size="sm">
      <CardContent className="flex flex-col items-center gap-1 py-3 text-center">
        {icon}
        <p className="font-heading text-xl font-bold">{value}</p>
        <p className="text-xs text-muted-foreground">{label}</p>
      </CardContent>
    </Card>
  );
}

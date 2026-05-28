'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { PlusIcon, GamepadIcon, EditIcon, TrashIcon } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import api from '@/lib/api';
import { toast } from '@/hooks/use-toast';
import type { Juego, TipoJuego } from '@/types';

const juegoSchema = z.object({
  nombre: z.string().min(2).max(60),
  tipo: z.enum(['TCG', 'VIDEOJUEGO']),
  iconoUrl: z.string().url('URL inválida').optional().or(z.literal('')),
});
type JuegoForm = z.infer<typeof juegoSchema>;

export default function AdminJuegosPage() {
  const qc = useQueryClient();
  const [modal, setModal] = useState<{ mode: 'create' | 'edit'; juego?: Juego } | null>(null);

  const { data: juegos, isLoading } = useQuery<Juego[]>({
    queryKey: ['juegos-admin'],
    queryFn: async () => {
      const res = await api.get<Juego[]>('/juegos?all=true');
      return res.data;
    },
  });

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<JuegoForm>({
    resolver: zodResolver(juegoSchema),
    defaultValues: { tipo: 'TCG' },
  });

  const tipoValue = watch('tipo');

  const createMutation = useMutation({
    mutationFn: (data: JuegoForm) => api.post('/juegos', data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['juegos-admin'] });
      qc.invalidateQueries({ queryKey: ['juegos'] });
      setModal(null);
      toast({ title: 'Juego creado' });
    },
    onError: () => toast({ title: 'Error al crear', variant: 'destructive' }),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<JuegoForm> }) =>
      api.patch(`/juegos/${id}`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['juegos-admin'] });
      qc.invalidateQueries({ queryKey: ['juegos'] });
      setModal(null);
      toast({ title: 'Juego actualizado' });
    },
  });

  const toggleMutation = useMutation({
    mutationFn: ({ id, activo }: { id: string; activo: boolean }) =>
      api.patch(`/juegos/${id}`, { activo }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['juegos-admin'] }),
  });

  const openCreate = () => {
    reset({ tipo: 'TCG', nombre: '', iconoUrl: '' });
    setModal({ mode: 'create' });
  };

  const openEdit = (juego: Juego) => {
    reset({ nombre: juego.nombre, tipo: juego.tipo, iconoUrl: juego.iconoUrl ?? '' });
    setModal({ mode: 'edit', juego });
  };

  const onSubmit = (data: JuegoForm) => {
    if (modal?.mode === 'create') {
      createMutation.mutate(data);
    } else if (modal?.mode === 'edit' && modal.juego) {
      updateMutation.mutate({ id: modal.juego.id, data });
    }
  };

  return (
    <div className="max-w-2xl space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-2xl font-bold">Catálogo de juegos</h1>
          <p className="text-sm text-muted-foreground">Gestiona los juegos disponibles en la plataforma</p>
        </div>
        <Button onClick={openCreate}>
          <PlusIcon className="mr-1 size-4" />
          Nuevo juego
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-16 rounded-xl" />)}
        </div>
      ) : (juegos ?? []).length === 0 ? (
        <Card>
          <CardContent className="py-14 text-center text-sm text-muted-foreground">
            Sin juegos aún.{' '}
            <button onClick={openCreate} className="text-primary underline">
              Crea el primero
            </button>
          </CardContent>
        </Card>
      ) : (
        <div className="divide-y divide-border rounded-xl border border-border bg-card overflow-hidden">
          {juegos!.map((juego) => (
            <div key={juego.id} className="flex items-center gap-3 px-4 py-3">
              <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                {juego.iconoUrl ? (
                  <img src={juego.iconoUrl} alt={juego.nombre} className="size-6 object-contain" />
                ) : (
                  <GamepadIcon className="size-4 text-primary" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm">{juego.nombre}</p>
                <Badge variant="outline" className="text-[10px]">{juego.tipo}</Badge>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Switch
                  checked={juego.activo}
                  onCheckedChange={(checked) => toggleMutation.mutate({ id: juego.id, activo: checked })}
                />
                <Button variant="ghost" size="icon" className="size-8" onClick={() => openEdit(juego)}>
                  <EditIcon className="size-3.5" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create/Edit dialog */}
      <Dialog open={!!modal} onOpenChange={(o) => !o && setModal(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{modal?.mode === 'create' ? 'Nuevo juego' : 'Editar juego'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="nombre">Nombre *</Label>
              <Input id="nombre" {...register('nombre')} placeholder="Yu-Gi-Oh!" />
              {errors.nombre && <p className="text-xs text-destructive">{errors.nombre.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label>Tipo *</Label>
              <div className="flex gap-2">
                {(['TCG', 'VIDEOJUEGO'] as const).map((t) => (
                  <label
                    key={t}
                    className={`flex flex-1 cursor-pointer items-center justify-center rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${
                      tipoValue === t
                        ? 'border-primary bg-primary/10 text-primary'
                        : 'border-border text-muted-foreground hover:border-border/80'
                    }`}
                  >
                    <input type="radio" value={t} {...register('tipo')} className="sr-only" />
                    {t}
                  </label>
                ))}
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="iconoUrl">URL del ícono</Label>
              <Input id="iconoUrl" {...register('iconoUrl')} placeholder="https://…" />
              {errors.iconoUrl && <p className="text-xs text-destructive">{errors.iconoUrl.message}</p>}
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setModal(null)}>Cancelar</Button>
              <Button type="submit" disabled={isSubmitting || createMutation.isPending || updateMutation.isPending}>
                {modal?.mode === 'create' ? 'Crear' : 'Guardar'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

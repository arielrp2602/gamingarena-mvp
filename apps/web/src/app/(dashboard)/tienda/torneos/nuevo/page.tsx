'use client';

import { useRouter } from 'next/navigation';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useQuery, useMutation } from '@tanstack/react-query';
import { PlusIcon, TrashIcon } from 'lucide-react';
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Select } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import api from '@/lib/api';
import { toast } from '@/hooks/use-toast';
import { createTorneoSchema, type CreateTorneoFormData } from '@/schemas/torneo.schema';
import type { Juego, FormatoTienda } from '@/types';

export default function NuevoTorneoPage() {
  const router = useRouter();
  const [reglas, setReglas] = useState<string[]>(['']);

  const {
    register,
    handleSubmit,
    control,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<CreateTorneoFormData>({
    resolver: zodResolver(createTorneoSchema),
    defaultValues: {
      tipoTorneo: 'COMPETITIVO',
      cupoMaximo: 16,
      deckListObligatoria: false,
      juezRequerido: false,
      pctTienda: 10,
      pctJuez: 5,
    },
  });

  const tipoTorneo = watch('tipoTorneo');
  const juegoId = watch('juegoId');

  const { data: juegos } = useQuery<Juego[]>({
    queryKey: ['juegos'],
    queryFn: async () => {
      const res = await api.get<Juego[]>('/juegos');
      return res.data;
    },
  });

  const { data: formatos } = useQuery<FormatoTienda[]>({
    queryKey: ['formatos-tienda', juegoId],
    queryFn: async () => {
      const res = await api.get<FormatoTienda[]>(`/formatos/tienda?juegoId=${juegoId}`);
      return res.data;
    },
    enabled: !!juegoId,
  });

  const createMutation = useMutation({
    mutationFn: (data: CreateTorneoFormData & { reglasPartida: string[] }) =>
      api.post('/torneos', data),
    onSuccess: (res) => {
      toast({ title: 'Torneo creado correctamente' });
      router.push(`/tienda/torneos/${res.data.id}`);
    },
    onError: () => toast({ title: 'Error al crear el torneo', variant: 'destructive' }),
  });

  const onSubmit = (data: CreateTorneoFormData) => {
    createMutation.mutate({
      ...data,
      reglasPartida: reglas.filter(Boolean),
    });
  };

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-bold">Crear torneo</h1>
        <p className="text-sm text-muted-foreground">Configura los detalles de tu torneo</p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        {/* Información básica */}
        <Card>
          <CardHeader>
            <CardTitle>Información básica</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="nombre">Nombre del torneo *</Label>
              <Input id="nombre" {...register('nombre')} placeholder="Grand Prix Yu-Gi-Oh!" />
              {errors.nombre && <p className="text-xs text-destructive">{errors.nombre.message}</p>}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="descripcion">Descripción</Label>
              <Textarea
                id="descripcion"
                {...register('descripcion')}
                placeholder="Describe tu torneo, reglas especiales, premios…"
                rows={3}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="juegoId">Juego *</Label>
                <Controller
                  control={control}
                  name="juegoId"
                  render={({ field }) => (
                    <select
                      id="juegoId"
                      value={field.value ?? ''}
                      onChange={field.onChange}
                      className="flex h-9 w-full rounded-lg border border-input bg-transparent px-3 py-1 text-sm shadow-xs outline-none focus:border-ring focus:ring-3 focus:ring-ring/50"
                    >
                      <option value="">Selecciona…</option>
                      {juegos?.map((j) => (
                        <option key={j.id} value={j.id}>{j.nombre}</option>
                      ))}
                    </select>
                  )}
                />
                {errors.juegoId && <p className="text-xs text-destructive">{errors.juegoId.message}</p>}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="formatoId">Formato *</Label>
                <Controller
                  control={control}
                  name="formatoId"
                  render={({ field }) => (
                    <select
                      id="formatoId"
                      value={field.value ?? ''}
                      onChange={field.onChange}
                      disabled={!juegoId || !formatos?.length}
                      className="flex h-9 w-full rounded-lg border border-input bg-transparent px-3 py-1 text-sm shadow-xs outline-none focus:border-ring focus:ring-3 focus:ring-ring/50 disabled:opacity-50"
                    >
                      <option value="">{!juegoId ? 'Elige un juego primero' : 'Selecciona…'}</option>
                      {formatos?.map((f) => (
                        <option key={f.id} value={f.id}>{f.formatoJuego.nombre}</option>
                      ))}
                    </select>
                  )}
                />
                {errors.formatoId && <p className="text-xs text-destructive">{errors.formatoId.message}</p>}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="fechaInicio">Fecha de inicio *</Label>
                <Input id="fechaInicio" type="datetime-local" {...register('fechaInicio')} />
                {errors.fechaInicio && <p className="text-xs text-destructive">{errors.fechaInicio.message}</p>}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="fechaFin">Fecha fin (opcional)</Label>
                <Input id="fechaFin" type="datetime-local" {...register('fechaFin')} />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tipo y cupo */}
        <Card>
          <CardHeader>
            <CardTitle>Tipo y cupo</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Tipo de torneo *</Label>
                <div className="flex gap-2">
                  {(['COMPETITIVO', 'CASUAL'] as const).map((tipo) => (
                    <label
                      key={tipo}
                      className={`flex flex-1 cursor-pointer items-center justify-center rounded-lg border px-3 py-2.5 text-sm font-medium transition-colors ${
                        tipoTorneo === tipo
                          ? 'border-primary bg-primary/10 text-primary'
                          : 'border-border bg-transparent text-muted-foreground hover:border-border/80'
                      }`}
                    >
                      <input
                        type="radio"
                        value={tipo}
                        {...register('tipoTorneo')}
                        className="sr-only"
                      />
                      {tipo === 'COMPETITIVO' ? 'Competitivo' : 'Casual'}
                    </label>
                  ))}
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="cupoMaximo">Cupo máximo *</Label>
                <Input
                  id="cupoMaximo"
                  type="number"
                  min={4}
                  max={256}
                  step={4}
                  {...register('cupoMaximo')}
                />
                {errors.cupoMaximo && <p className="text-xs text-destructive">{errors.cupoMaximo.message}</p>}
              </div>
            </div>

            {tipoTorneo === 'COMPETITIVO' && (
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="inscripcionPrecio">Precio inscripción (MXN)</Label>
                  <Input
                    id="inscripcionPrecio"
                    type="number"
                    min={0}
                    step={10}
                    {...register('inscripcionPrecio')}
                    placeholder="200"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="tiempoPorRondaMinutos">Minutos por ronda</Label>
                  <Input
                    id="tiempoPorRondaMinutos"
                    type="number"
                    min={10}
                    max={120}
                    {...register('tiempoPorRondaMinutos')}
                    placeholder="50"
                  />
                </div>
              </div>
            )}

            {tipoTorneo === 'COMPETITIVO' && (
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="pctTienda">% para tienda</Label>
                  <Input id="pctTienda" type="number" min={0} max={100} {...register('pctTienda')} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="pctJuez">% para juez</Label>
                  <Input id="pctJuez" type="number" min={0} max={100} {...register('pctJuez')} />
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Opciones */}
        <Card>
          <CardHeader>
            <CardTitle>Opciones</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <Controller
                control={control}
                name="deckListObligatoria"
                render={({ field }) => (
                  <label className="flex cursor-pointer items-center gap-2.5">
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                    <span className="text-sm">Decklist obligatoria</span>
                  </label>
                )}
              />
              <Controller
                control={control}
                name="juezRequerido"
                render={({ field }) => (
                  <label className="flex cursor-pointer items-center gap-2.5">
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                    <span className="text-sm">Requiere árbitro</span>
                  </label>
                )}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="rondasTotales">Rondas totales (suizo)</Label>
              <Input
                id="rondasTotales"
                type="number"
                min={1}
                max={15}
                {...register('rondasTotales')}
                placeholder="Auto (recomendado)"
              />
              <p className="text-xs text-muted-foreground">
                Deja vacío para calcularlo automáticamente según el cupo
              </p>
            </div>

            <Separator />

            {/* Reglas personalizadas */}
            <div className="space-y-2">
              <Label>Reglas de la partida</Label>
              {reglas.map((r, i) => (
                <div key={i} className="flex gap-2">
                  <Input
                    value={r}
                    onChange={(e) => {
                      const next = [...reglas];
                      next[i] = e.target.value;
                      setReglas(next);
                    }}
                    placeholder={`Regla ${i + 1}…`}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => setReglas(reglas.filter((_, j) => j !== i))}
                    disabled={reglas.length === 1}
                  >
                    <TrashIcon className="size-4 text-muted-foreground" />
                  </Button>
                </div>
              ))}
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setReglas([...reglas, ''])}
              >
                <PlusIcon className="mr-1 size-3.5" />
                Añadir regla
              </Button>
            </div>
          </CardContent>
        </Card>

        <div className="flex items-center gap-3">
          <Button type="submit" disabled={isSubmitting || createMutation.isPending}>
            {createMutation.isPending ? 'Creando…' : 'Crear torneo'}
          </Button>
          <Button type="button" variant="ghost" onClick={() => router.back()}>
            Cancelar
          </Button>
        </div>
      </form>
    </div>
  );
}

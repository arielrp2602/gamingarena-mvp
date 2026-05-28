'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Spinner } from '@/components/ui/spinner';
import { Separator } from '@/components/ui/separator';
import { useAuth } from '@/hooks/use-auth';
import { registerSchema, type RegisterFormData } from '@/schemas/auth.schema';

const ROLES_INFO = [
  {
    id: 'JUGADOR' as const,
    label: 'Jugador',
    desc: 'Inscríbete a torneos, sube tu decklist y compite',
  },
  {
    id: 'TIENDA' as const,
    label: 'Tienda',
    desc: 'Organiza torneos, cobra entry fees y gestiona inscritos',
  },
  {
    id: 'JUEZ' as const,
    label: 'Juez',
    desc: 'Arbitro torneos y resuelve disputas entre jugadores',
  },
];

export default function RegisterPage() {
  const router = useRouter();
  const { register: registerUser, isRegisterPending, registerError } = useAuth();
  const [selectedRoles, setSelectedRoles] = useState<string[]>(['JUGADOR']);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
    defaultValues: { roles: ['JUGADOR'] },
  });

  const watchedRoles = watch('roles') ?? [];

  function toggleRole(role: string) {
    const next = watchedRoles.includes(role)
      ? watchedRoles.filter((r) => r !== role)
      : [...watchedRoles, role];
    setValue('roles', next as ('JUGADOR' | 'TIENDA' | 'JUEZ')[], { shouldValidate: true });
    setSelectedRoles(next);
  }

  const hasJugadorOrJuez = selectedRoles.some((r) => r === 'JUGADOR' || r === 'JUEZ');
  const hasTienda = selectedRoles.includes('TIENDA');

  async function onSubmit(data: RegisterFormData) {
    try {
      await registerUser(data);
      router.replace('/dashboard');
    } catch {
      // shown via registerError
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl">Crear cuenta</CardTitle>
        <CardDescription>Elige tus roles y completa tu perfil</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          {registerError && (
            <Alert variant="destructive">
              <AlertDescription>{registerError}</AlertDescription>
            </Alert>
          )}

          {/* Roles */}
          <div className="space-y-2">
            <Label>¿Cómo participas?</Label>
            <div className="space-y-2">
              {ROLES_INFO.map((r) => (
                <label
                  key={r.id}
                  className={`flex cursor-pointer items-start gap-3 rounded-lg border p-3 transition-colors ${
                    watchedRoles.includes(r.id)
                      ? 'border-primary/50 bg-primary/10'
                      : 'border-border hover:border-border/80 hover:bg-muted/30'
                  }`}
                >
                  <Checkbox
                    checked={watchedRoles.includes(r.id)}
                    onCheckedChange={() => toggleRole(r.id)}
                    className="mt-0.5"
                  />
                  <div>
                    <p className="text-sm font-medium">{r.label}</p>
                    <p className="text-xs text-muted-foreground">{r.desc}</p>
                  </div>
                </label>
              ))}
            </div>
            {errors.roles && (
              <p className="text-xs text-destructive">{errors.roles.message}</p>
            )}
          </div>

          <Separator />

          {/* Datos comunes */}
          <div className="space-y-1.5">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="tu@email.com"
              autoComplete="email"
              {...register('email')}
              aria-invalid={!!errors.email}
            />
            {errors.email && (
              <p className="text-xs text-destructive">{errors.email.message}</p>
            )}
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="password">Contraseña</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                autoComplete="new-password"
                {...register('password')}
                aria-invalid={!!errors.password}
              />
              {errors.password && (
                <p className="text-xs text-destructive">{errors.password.message}</p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="confirmPassword">Confirmar contraseña</Label>
              <Input
                id="confirmPassword"
                type="password"
                placeholder="••••••••"
                autoComplete="new-password"
                {...register('confirmPassword')}
                aria-invalid={!!errors.confirmPassword}
              />
              {errors.confirmPassword && (
                <p className="text-xs text-destructive">{errors.confirmPassword.message}</p>
              )}
            </div>
          </div>

          {/* Campos Jugador / Juez */}
          {hasJugadorOrJuez && (
            <>
              <Separator />
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Perfil de jugador/juez
              </p>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="nombre">Nombre / alias</Label>
                  <Input
                    id="nombre"
                    placeholder="Tu apodo de torneo"
                    {...register('nombre')}
                    aria-invalid={!!errors.nombre}
                  />
                  {errors.nombre && (
                    <p className="text-xs text-destructive">{errors.nombre.message}</p>
                  )}
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="ciudad">Ciudad</Label>
                  <Input
                    id="ciudad"
                    placeholder="CDMX, Monterrey..."
                    {...register('ciudad')}
                    aria-invalid={!!errors.ciudad}
                  />
                  {errors.ciudad && (
                    <p className="text-xs text-destructive">{errors.ciudad.message}</p>
                  )}
                </div>
              </div>
            </>
          )}

          {/* Campos Tienda */}
          {hasTienda && (
            <>
              <Separator />
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Datos de la tienda
              </p>
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <Label htmlFor="nombreTienda">Nombre de la tienda</Label>
                  <Input
                    id="nombreTienda"
                    placeholder="Card Shop MTY..."
                    {...register('nombreTienda')}
                    aria-invalid={!!errors.nombreTienda}
                  />
                  {errors.nombreTienda && (
                    <p className="text-xs text-destructive">{errors.nombreTienda.message}</p>
                  )}
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label htmlFor="ciudadTienda">Ciudad</Label>
                    <Input
                      id="ciudadTienda"
                      placeholder="Ciudad"
                      {...register('ciudadTienda')}
                      aria-invalid={!!errors.ciudadTienda}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="telefono">Teléfono</Label>
                    <Input
                      id="telefono"
                      placeholder="+52 55 1234 5678"
                      {...register('telefono')}
                      aria-invalid={!!errors.telefono}
                    />
                  </div>
                </div>
              </div>
            </>
          )}

          <Button type="submit" className="w-full" disabled={isRegisterPending}>
            {isRegisterPending && <Spinner className="mr-2" />}
            Crear cuenta
          </Button>

          <p className="text-center text-sm text-muted-foreground">
            ¿Ya tienes cuenta?{' '}
            <Link href="/login" className="text-primary hover:underline">
              Inicia sesión
            </Link>
          </p>
        </form>
      </CardContent>
    </Card>
  );
}

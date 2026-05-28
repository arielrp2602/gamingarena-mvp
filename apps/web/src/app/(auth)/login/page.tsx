'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Spinner } from '@/components/ui/spinner';
import { useAuth } from '@/hooks/use-auth';
import { loginSchema, type LoginFormData } from '@/schemas/auth.schema';

export default function LoginPage() {
  const router = useRouter();
  const params = useSearchParams();
  const redirect = params.get('redirect') ?? '/dashboard';
  const { login, isLoginPending, loginError, isAuthenticated } = useAuth();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({ resolver: zodResolver(loginSchema) });

  useEffect(() => {
    if (isAuthenticated) router.replace(redirect);
  }, [isAuthenticated, redirect, router]);

  async function onSubmit(data: LoginFormData) {
    try {
      await login(data);
      router.replace(redirect);
    } catch {
      // error shown via loginError
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl">Iniciar sesión</CardTitle>
        <CardDescription>Ingresa tus credenciales para continuar</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {loginError && (
            <Alert variant="destructive">
              <AlertDescription>{loginError}</AlertDescription>
            </Alert>
          )}

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

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label htmlFor="password">Contraseña</Label>
              <Link
                href="/forgot-password"
                className="text-xs text-primary hover:underline"
              >
                ¿Olvidaste tu contraseña?
              </Link>
            </div>
            <Input
              id="password"
              type="password"
              placeholder="••••••••"
              autoComplete="current-password"
              {...register('password')}
              aria-invalid={!!errors.password}
            />
            {errors.password && (
              <p className="text-xs text-destructive">{errors.password.message}</p>
            )}
          </div>

          <Button type="submit" className="w-full" disabled={isLoginPending}>
            {isLoginPending && <Spinner className="mr-2" />}
            Iniciar sesión
          </Button>

          <p className="text-center text-sm text-muted-foreground">
            ¿No tienes cuenta?{' '}
            <Link href="/register" className="text-primary hover:underline">
              Regístrate
            </Link>
          </p>
        </form>
      </CardContent>
    </Card>
  );
}

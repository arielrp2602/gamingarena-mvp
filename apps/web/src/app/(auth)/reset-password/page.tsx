'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { LockIcon, CheckCircleIcon } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { resetPasswordSchema } from '@/schemas/auth.schema';
import type { z } from 'zod';
import api from '@/lib/api';

type ResetPasswordForm = z.infer<typeof resetPasswordSchema>;

export default function ResetPasswordPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token');
  const [done, setDone] = useState(false);
  const [tokenError, setTokenError] = useState(false);

  useEffect(() => {
    if (!token) setTokenError(true);
  }, [token]);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ResetPasswordForm>({
    resolver: zodResolver(resetPasswordSchema),
  });

  const resetMutation = useMutation({
    mutationFn: (data: ResetPasswordForm) =>
      api.post('/auth/reset-password', { token, newPassword: data.password }),
    onSuccess: () => setDone(true),
  });

  if (tokenError) {
    return (
      <Card>
        <CardContent className="py-10 text-center space-y-3">
          <LockIcon className="size-10 text-destructive/50 mx-auto" />
          <p className="font-medium">Enlace inválido</p>
          <p className="text-sm text-muted-foreground">
            Este enlace no es válido o ha expirado.
          </p>
          <Button variant="outline" onClick={() => router.push('/forgot-password')}>
            Solicitar nuevo enlace
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (done) {
    return (
      <Card>
        <CardContent className="py-10 text-center space-y-4">
          <div className="mx-auto flex size-14 items-center justify-center rounded-full bg-success/15">
            <CheckCircleIcon className="size-7 text-success" />
          </div>
          <div>
            <p className="font-heading font-semibold">Contraseña actualizada</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Ya puedes iniciar sesión con tu nueva contraseña.
            </p>
          </div>
          <Button onClick={() => router.push('/login')}>Ir a iniciar sesión</Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Nueva contraseña</CardTitle>
        <CardDescription>Elige una contraseña segura para tu cuenta</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit((d) => resetMutation.mutate(d))} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="password">Nueva contraseña</Label>
            <Input
              id="password"
              type="password"
              autoComplete="new-password"
              {...register('password')}
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
              autoComplete="new-password"
              {...register('confirmPassword')}
            />
            {errors.confirmPassword && (
              <p className="text-xs text-destructive">{errors.confirmPassword.message}</p>
            )}
          </div>

          {resetMutation.error && (
            <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
              No se pudo actualizar la contraseña. El enlace puede haber expirado.
            </p>
          )}

          <Button type="submit" className="w-full" disabled={resetMutation.isPending}>
            {resetMutation.isPending ? 'Actualizando…' : 'Actualizar contraseña'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

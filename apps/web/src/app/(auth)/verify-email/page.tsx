'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { CheckCircleIcon, XCircleIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Spinner } from '@/components/ui/spinner';
import api from '@/lib/api';
import { useAuthStore } from '@/store/auth.store';
import type { AuthUser } from '@/types';

export default function VerifyEmailPage() {
  const params = useSearchParams();
  const router = useRouter();
  const token = params.get('token');
  const { setUser } = useAuthStore();

  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!token) {
      setStatus('error');
      setMessage('Token de verificación no encontrado.');
      return;
    }

    api
      .get<AuthUser>(`/auth/verify-email?token=${token}`)
      .then((res) => {
        setUser(res.data);
        setStatus('success');
        setTimeout(() => router.replace('/dashboard'), 2000);
      })
      .catch(() => {
        setStatus('error');
        setMessage('El enlace de verificación es inválido o ha expirado.');
      });
  }, [token, setUser, router]);

  return (
    <Card>
      <CardContent className="pt-6 text-center space-y-4">
        {status === 'loading' && (
          <>
            <Spinner className="mx-auto size-10" />
            <p className="text-sm text-muted-foreground">Verificando tu email...</p>
          </>
        )}
        {status === 'success' && (
          <>
            <CheckCircleIcon className="mx-auto size-12 text-green-400" />
            <div>
              <h2 className="font-heading text-lg font-bold">¡Email verificado!</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Redirigiendo al dashboard...
              </p>
            </div>
          </>
        )}
        {status === 'error' && (
          <>
            <XCircleIcon className="mx-auto size-12 text-destructive" />
            <div>
              <h2 className="font-heading text-lg font-bold text-destructive">
                Error de verificación
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">{message}</p>
            </div>
            <Button variant="outline" asChild className="w-full">
              <Link href="/login">Ir al inicio de sesión</Link>
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  );
}

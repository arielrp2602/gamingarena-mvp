'use client';

import { useEffect } from 'react';
import * as Sentry from '@sentry/nextjs';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html lang="es" className="dark">
      <body className="min-h-screen bg-background text-foreground flex items-center justify-center">
        <div className="text-center space-y-4">
          <h1 className="text-2xl font-bold text-destructive">Algo salió mal</h1>
          <p className="text-muted-foreground">Error inesperado. Por favor intenta de nuevo.</p>
          <button
            onClick={reset}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/80"
          >
            Reintentar
          </button>
        </div>
      </body>
    </html>
  );
}

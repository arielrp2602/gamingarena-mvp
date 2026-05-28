'use client';

import { useToastState } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

export function Toaster() {
  const { toasts } = useToastState();

  return (
    <div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={cn(
            'flex min-w-64 max-w-sm items-start gap-3 rounded-xl border px-4 py-3 shadow-lg animate-in slide-in-from-bottom-2',
            t.variant === 'destructive'
              ? 'border-destructive/30 bg-destructive/10 text-destructive'
              : 'border-border bg-card text-foreground',
          )}
        >
          <div className="flex-1">
            <p className="text-sm font-medium">{t.title}</p>
            {t.description && (
              <p className="text-xs text-muted-foreground mt-0.5">{t.description}</p>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

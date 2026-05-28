'use client';

// Minimal toast hook — can be replaced with sonner or radix toast later
import { useState, useCallback } from 'react';

export interface Toast {
  id: string;
  title: string;
  description?: string;
  variant?: 'default' | 'destructive';
}

let toastQueue: ((t: Omit<Toast, 'id'>) => void) | null = null;

export function useToastState() {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const addToast = useCallback((t: Omit<Toast, 'id'>) => {
    const id = Math.random().toString(36).slice(2);
    setToasts((prev) => [...prev, { ...t, id }]);
    setTimeout(() => setToasts((prev) => prev.filter((x) => x.id !== id)), 4000);
  }, []);

  toastQueue = addToast;

  return { toasts, addToast };
}

export function toast(t: Omit<Toast, 'id'>) {
  if (toastQueue) toastQueue(t);
  else console.warn('[toast]', t.title, t.description);
}

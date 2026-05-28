'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { MessageSquareIcon, CheckCircleIcon, BugIcon, LightbulbIcon } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import api from '@/lib/api';
import { toast } from '@/hooks/use-toast';
import { formatDate } from '@/lib/utils';

type FeedbackTipo = 'BUG' | 'SUGERENCIA' | 'OTRO';

interface Feedback {
  id: string;
  tipo: FeedbackTipo;
  mensaje: string;
  resuelto: boolean;
  createdAt: string;
  user: { email: string };
}

const TIPO_CONFIG: Record<FeedbackTipo, { label: string; icon: React.ReactNode; cls: string }> = {
  BUG: {
    label: 'Bug',
    icon: <BugIcon className="size-3.5" />,
    cls: 'border-destructive/30 bg-destructive/10 text-destructive',
  },
  SUGERENCIA: {
    label: 'Sugerencia',
    icon: <LightbulbIcon className="size-3.5" />,
    cls: 'border-warning/30 bg-warning/10 text-warning',
  },
  OTRO: {
    label: 'Otro',
    icon: <MessageSquareIcon className="size-3.5" />,
    cls: 'border-muted-foreground/30 bg-muted/50 text-muted-foreground',
  },
};

export default function AdminFeedbackPage() {
  const qc = useQueryClient();
  const [tab, setTab] = useState<'pendiente' | 'resuelto'>('pendiente');

  const { data: feedbacks, isLoading } = useQuery<Feedback[]>({
    queryKey: ['admin-feedback', tab],
    queryFn: async () => {
      const res = await api.get<Feedback[]>(`/feedback?resuelto=${tab === 'resuelto'}`);
      return res.data;
    },
  });

  const resolverMutation = useMutation({
    mutationFn: (id: string) => api.patch(`/feedback/${id}/resolver`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-feedback'] });
      toast({ title: 'Feedback marcado como resuelto' });
    },
    onError: () => toast({ title: 'Error', variant: 'destructive' }),
  });

  return (
    <div className="max-w-2xl space-y-5">
      <div>
        <h1 className="font-heading text-2xl font-bold">Feedback</h1>
        <p className="text-sm text-muted-foreground">Bugs y sugerencias de los usuarios</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-border">
        {([
          { key: 'pendiente', label: 'Pendiente' },
          { key: 'resuelto', label: 'Resuelto' },
        ] as const).map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`border-b-2 px-4 py-2 text-sm font-medium transition-colors ${
              tab === t.key
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-24 rounded-xl" />)}
        </div>
      ) : (feedbacks ?? []).length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-14 text-center">
            <CheckCircleIcon className="size-10 text-success/40" />
            <p className="text-sm text-muted-foreground">
              Sin feedback {tab === 'pendiente' ? 'pendiente' : 'resuelto'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {feedbacks!.map((fb) => {
            const config = TIPO_CONFIG[fb.tipo];
            return (
              <div key={fb.id} className="rounded-xl border border-border bg-card px-4 py-3 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <Badge variant="outline" className={`gap-1 ${config.cls}`}>
                    {config.icon}
                    {config.label}
                  </Badge>
                  <span className="text-xs text-muted-foreground">{formatDate(fb.createdAt)}</span>
                </div>
                <p className="text-sm">{fb.mensaje}</p>
                <div className="flex items-center justify-between">
                  <p className="text-xs text-muted-foreground">{fb.user.email}</p>
                  {!fb.resuelto && (
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-6 text-xs text-success hover:text-success"
                      onClick={() => resolverMutation.mutate(fb.id)}
                      disabled={resolverMutation.isPending}
                    >
                      <CheckCircleIcon className="mr-1 size-3" />
                      Marcar resuelto
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

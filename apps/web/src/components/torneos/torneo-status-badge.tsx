import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { TorneoStatus, TipoTorneo } from '@/types';

const STATUS_CONFIG: Record<
  TorneoStatus,
  { label: string; className: string }
> = {
  BORRADOR: { label: 'Borrador', className: 'bg-muted text-muted-foreground border-border' },
  ABIERTO: { label: 'Inscripciones abiertas', className: 'bg-green-500/20 text-green-400 border-green-500/30' },
  EN_CURSO: { label: 'En curso', className: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30' },
  FINALIZADO: { label: 'Finalizado', className: 'bg-muted text-muted-foreground border-border' },
  CANCELADO: { label: 'Cancelado', className: 'bg-destructive/20 text-destructive border-destructive/30' },
};

const TIPO_CONFIG: Record<TipoTorneo, { label: string; className: string }> = {
  COMPETITIVO: { label: 'Competitivo', className: 'bg-purple-500/20 text-purple-400 border-purple-500/30' },
  CASUAL: { label: 'Casual', className: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30' },
};

export function TorneoStatusBadge({ status }: { status: TorneoStatus }) {
  const config = STATUS_CONFIG[status];
  return (
    <Badge variant="outline" className={cn('border', config.className)}>
      {config.label}
    </Badge>
  );
}

export function TorneoTipoBadge({ tipo }: { tipo: TipoTorneo }) {
  const config = TIPO_CONFIG[tipo];
  return (
    <Badge variant="outline" className={cn('border', config.className)}>
      {config.label}
    </Badge>
  );
}

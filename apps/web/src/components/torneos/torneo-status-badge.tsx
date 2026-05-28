import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { TorneoStatus, TipoTorneo } from '@/types';

const STATUS_CONFIG: Record<
  TorneoStatus,
  { label: string; className: string }
> = {
  BORRADOR: { label: 'Borrador', className: 'bg-muted text-muted-foreground border-border' },
  ABIERTO: { label: 'Inscripciones abiertas', className: 'bg-success/20 text-success border-success/30' },
  EN_CURSO: { label: 'En curso', className: 'bg-gold/20 text-gold border-gold/30' },
  FINALIZADO: { label: 'Finalizado', className: 'bg-muted text-muted-foreground border-border' },
  CANCELADO: { label: 'Cancelado', className: 'bg-destructive/20 text-destructive border-destructive/30' },
};

const TIPO_CONFIG: Record<TipoTorneo, { label: string; className: string }> = {
  COMPETITIVO: { label: 'Competitivo', className: 'bg-gaming-purple/20 text-gaming-purple border-gaming-purple/30' },
  CASUAL: { label: 'Casual', className: 'bg-info/20 text-info border-info/30' },
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

import { Spinner } from '@/components/ui/spinner';
import { cn } from '@/lib/utils';

interface LoadingProps {
  text?: string;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

const sizeMap = { sm: 'size-4', md: 'size-6', lg: 'size-10' };

export function Loading({ text, className, size = 'md' }: LoadingProps) {
  return (
    <div className={cn('flex flex-col items-center justify-center gap-3 p-8', className)}>
      <Spinner className={sizeMap[size]} />
      {text && <p className="text-sm text-muted-foreground">{text}</p>}
    </div>
  );
}

export function PageLoading() {
  return (
    <div className="flex min-h-[50vh] items-center justify-center">
      <Loading size="lg" text="Cargando..." />
    </div>
  );
}

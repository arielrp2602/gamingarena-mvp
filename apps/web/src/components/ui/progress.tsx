import * as React from 'react';
import { Progress as ProgressPrimitive } from '@base-ui/react/progress';
import { cn } from '@/lib/utils';

function Progress({
  className,
  value,
  ...props
}: ProgressPrimitive.Root.Props) {
  return (
    <ProgressPrimitive.Root
      value={value}
      className={cn('relative h-2 w-full overflow-hidden rounded-full bg-muted', className)}
      {...props}
    >
      <ProgressPrimitive.Track className="h-full w-full">
        <ProgressPrimitive.Indicator
          className="h-full bg-primary transition-all duration-300"
          style={{ width: `${value ?? 0}%` }}
        />
      </ProgressPrimitive.Track>
    </ProgressPrimitive.Root>
  );
}

export { Progress };

import * as React from 'react';
import { cn, getInitials } from '@/lib/utils';

interface AvatarProps extends React.ComponentProps<'div'> {
  src?: string | null;
  name?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

const sizeMap = {
  sm: 'size-7 text-xs',
  md: 'size-9 text-sm',
  lg: 'size-12 text-base',
  xl: 'size-16 text-lg',
};

function Avatar({ src, name, size = 'md', className, ...props }: AvatarProps) {
  const [imgError, setImgError] = React.useState(false);
  const initials = name ? getInitials(name) : '?';

  return (
    <div
      className={cn(
        'relative flex shrink-0 overflow-hidden rounded-full bg-muted ring-2 ring-border',
        sizeMap[size],
        className,
      )}
      {...props}
    >
      {src && !imgError ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          alt={name ?? 'avatar'}
          className="h-full w-full object-cover"
          onError={() => setImgError(true)}
        />
      ) : (
        <span className="flex h-full w-full items-center justify-center font-semibold text-muted-foreground">
          {initials}
        </span>
      )}
    </div>
  );
}

export { Avatar };

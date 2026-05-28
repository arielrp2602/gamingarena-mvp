'use client';

import * as React from 'react';
import { Select as SelectPrimitive } from '@base-ui/react/select';
import { CheckIcon, ChevronDownIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

function Select(props: SelectPrimitive.Root.Props) {
  return <SelectPrimitive.Root {...props} />;
}

function SelectTrigger({
  className,
  children,
  ...props
}: SelectPrimitive.Trigger.Props) {
  return (
    <SelectPrimitive.Trigger
      className={cn(
        'flex h-8 w-full items-center justify-between rounded-lg border border-input bg-transparent px-2.5 py-1 text-sm outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 data-open:border-ring dark:bg-input/30',
        className,
      )}
      {...props}
    >
      {children}
      <SelectPrimitive.Icon className="ml-auto shrink-0">
        <ChevronDownIcon className="size-4 text-muted-foreground" />
      </SelectPrimitive.Icon>
    </SelectPrimitive.Trigger>
  );
}

function SelectValue(props: SelectPrimitive.Value.Props) {
  return <SelectPrimitive.Value {...props} />;
}

function SelectContent({
  className,
  children,
  ...props
}: SelectPrimitive.Popup.Props) {
  return (
    <SelectPrimitive.Portal>
      <SelectPrimitive.Positioner>
        <SelectPrimitive.Popup
          className={cn(
            'z-50 min-w-[8rem] overflow-hidden rounded-xl border border-border bg-popover p-1 text-sm text-popover-foreground shadow-md data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95',
            className,
          )}
          {...props}
        >
          <SelectPrimitive.ScrollUpArrow />
          <SelectPrimitive.Viewport>{children}</SelectPrimitive.Viewport>
          <SelectPrimitive.ScrollDownArrow />
        </SelectPrimitive.Popup>
      </SelectPrimitive.Positioner>
    </SelectPrimitive.Portal>
  );
}

function SelectItem({
  className,
  children,
  ...props
}: SelectPrimitive.Item.Props) {
  return (
    <SelectPrimitive.Item
      className={cn(
        'relative flex cursor-default select-none items-center gap-2 rounded-lg px-2.5 py-1.5 text-sm outline-none data-highlighted:bg-accent data-highlighted:text-accent-foreground data-disabled:pointer-events-none data-disabled:opacity-50',
        className,
      )}
      {...props}
    >
      <SelectPrimitive.ItemIndicator className="absolute left-0 flex size-4 items-center justify-center">
        <CheckIcon className="size-3" />
      </SelectPrimitive.ItemIndicator>
      <SelectPrimitive.ItemText>{children}</SelectPrimitive.ItemText>
    </SelectPrimitive.Item>
  );
}

function SelectLabel({ className, ...props }: SelectPrimitive.Group.Label.Props) {
  return (
    <SelectPrimitive.Group.Label
      className={cn('px-2.5 py-1 text-xs font-semibold text-muted-foreground', className)}
      {...props}
    />
  );
}

function SelectGroup(props: SelectPrimitive.Group.Props) {
  return <SelectPrimitive.Group {...props} />;
}

function SelectSeparator({ className, ...props }: React.ComponentProps<'div'>) {
  return <div className={cn('-mx-1 my-1 h-px bg-border', className)} {...props} />;
}

export {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
};

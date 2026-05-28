'use client';

import * as React from 'react';
import { Menu } from '@base-ui/react/menu';
import { CheckIcon, ChevronRightIcon, CircleIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

function DropdownMenu(props: Menu.Root.Props) {
  return <Menu.Root {...props} />;
}

function DropdownMenuTrigger(props: Menu.Trigger.Props) {
  return <Menu.Trigger {...props} />;
}

function DropdownMenuContent({
  className,
  sideOffset = 4,
  ...props
}: Menu.Popup.Props & { sideOffset?: number }) {
  return (
    <Menu.Portal>
      <Menu.Positioner sideOffset={sideOffset}>
        <Menu.Popup
          className={cn(
            'z-50 min-w-[8rem] overflow-hidden rounded-xl border border-border bg-popover p-1 text-sm text-popover-foreground shadow-md data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95',
            className,
          )}
          {...props}
        />
      </Menu.Positioner>
    </Menu.Portal>
  );
}

function DropdownMenuItem({
  className,
  inset,
  asChild = false,
  children,
  ...props
}: Menu.Item.Props & { inset?: boolean; asChild?: boolean }) {
  const itemClassName = cn(
    'relative flex cursor-default select-none items-center gap-2 rounded-lg px-2.5 py-1.5 text-sm outline-none transition-colors data-highlighted:bg-accent data-highlighted:text-accent-foreground data-disabled:pointer-events-none data-disabled:opacity-50 [&>svg]:size-4',
    inset && 'pl-8',
    className,
  )

  // Base UI uses `render` prop instead of Radix's `asChild`
  if (asChild && React.isValidElement(children)) {
    const child = children as React.ReactElement<{ children?: React.ReactNode }>
    const { children: childChildren, ...childProps } = child.props
    const renderEl = React.cloneElement(child, { ...childProps, children: undefined })

    return (
      <Menu.Item
        className={itemClassName}
        render={renderEl}
        {...props}
      >
        {childChildren}
      </Menu.Item>
    )
  }

  return (
    <Menu.Item
      className={itemClassName}
      {...props}
    >
      {children}
    </Menu.Item>
  )
}

function DropdownMenuSeparator({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      role="separator"
      className={cn('-mx-1 my-1 h-px bg-border', className)}
      {...props}
    />
  );
}

function DropdownMenuLabel({
  className,
  inset,
  ...props
}: React.ComponentProps<'div'> & { inset?: boolean }) {
  return (
    <div
      className={cn(
        'px-2.5 py-1 text-xs font-semibold text-muted-foreground',
        inset && 'pl-8',
        className,
      )}
      {...props}
    />
  );
}

function DropdownMenuCheckboxItem({
  className,
  children,
  checked,
  ...props
}: Menu.CheckboxItem.Props) {
  return (
    <Menu.CheckboxItem
      className={cn(
        'relative flex cursor-default select-none items-center gap-2 rounded-lg py-1.5 pr-2.5 pl-8 text-sm outline-none data-highlighted:bg-accent data-highlighted:text-accent-foreground data-disabled:pointer-events-none data-disabled:opacity-50',
        className,
      )}
      checked={checked}
      {...props}
    >
      <span className="absolute left-2 flex size-4 items-center justify-center">
        <Menu.CheckboxItemIndicator>
          <CheckIcon className="size-3" />
        </Menu.CheckboxItemIndicator>
      </span>
      {children}
    </Menu.CheckboxItem>
  );
}

function DropdownMenuRadioGroup(props: Menu.RadioGroup.Props) {
  return <Menu.RadioGroup {...props} />;
}

function DropdownMenuRadioItem({
  className,
  children,
  ...props
}: Menu.RadioItem.Props) {
  return (
    <Menu.RadioItem
      className={cn(
        'relative flex cursor-default select-none items-center gap-2 rounded-lg py-1.5 pr-2.5 pl-8 text-sm outline-none data-highlighted:bg-accent data-highlighted:text-accent-foreground data-disabled:pointer-events-none data-disabled:opacity-50',
        className,
      )}
      {...props}
    >
      <span className="absolute left-2 flex size-4 items-center justify-center">
        <Menu.RadioItemIndicator>
          <CircleIcon className="size-2 fill-current" />
        </Menu.RadioItemIndicator>
      </span>
      {children}
    </Menu.RadioItem>
  );
}

function DropdownMenuSub(props: Menu.Root.Props) {
  return <Menu.Root {...props} />;
}

function DropdownMenuSubTrigger({
  className,
  inset,
  children,
  ...props
}: Menu.SubmenuTrigger.Props & { inset?: boolean }) {
  return (
    <Menu.SubmenuTrigger
      className={cn(
        'flex cursor-default select-none items-center gap-2 rounded-lg px-2.5 py-1.5 text-sm outline-none focus:bg-accent data-open:bg-accent [&>svg]:size-4',
        inset && 'pl-8',
        className,
      )}
      {...props}
    >
      {children}
      <ChevronRightIcon className="ml-auto size-4" />
    </Menu.SubmenuTrigger>
  );
}

export {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
};

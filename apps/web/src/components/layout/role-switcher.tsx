'use client';

import { ChevronDownIcon, CheckIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useAuth } from '@/hooks/use-auth';
import { ROLE_LABELS, ROLE_COLORS } from '@/constants/navigation';
import { cn } from '@/lib/utils';
import type { Role } from '@/types';

export function RoleSwitcher() {
  const { user, switchRole, isSwitchRolePending } = useAuth();

  if (!user || user.roles.length <= 1) return null;

  const activeRole = user.activeRole;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={<Button variant="outline" size="sm" className="gap-1.5" />}
        disabled={isSwitchRolePending}
      >
        <span
          className={cn(
            'rounded px-1.5 py-0.5 text-xs font-semibold',
            ROLE_COLORS[activeRole],
          )}
        >
          {ROLE_LABELS[activeRole]}
        </span>
        <ChevronDownIcon className="size-3 text-muted-foreground" />
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-40">
        <DropdownMenuLabel>Cambiar rol</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {user.roles.map((role) => (
          <DropdownMenuItem
            key={role}
            onClick={() => role !== activeRole && switchRole(role)}
            className="gap-2"
          >
            <span
              className={cn(
                'rounded px-1.5 py-0.5 text-xs font-semibold',
                ROLE_COLORS[role as Role],
              )}
            >
              {ROLE_LABELS[role as Role]}
            </span>
            {role === activeRole && (
              <CheckIcon className="ml-auto size-3 text-primary" />
            )}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

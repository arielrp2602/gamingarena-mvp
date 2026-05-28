'use client';

import { useState } from 'react';
import Link from 'next/link';
import { MenuIcon, TrophyIcon, LogOutIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar } from '@/components/ui/avatar';
import {
  Dialog,
  DialogContent,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { NotificationsBell } from './notifications-bell';
import { RoleSwitcher } from './role-switcher';
import { Sidebar } from './sidebar';
import { useAuth } from '@/hooks/use-auth';
import { cn } from '@/lib/utils';

interface NavbarProps {
  className?: string;
}

export function Navbar({ className }: NavbarProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { user, logout, isLogoutPending } = useAuth();

  return (
    <>
      <header
        className={cn(
          'sticky top-0 z-40 flex h-14 items-center gap-3 border-b border-border bg-background/80 px-4 backdrop-blur-sm',
          className,
        )}
      >
        {/* Mobile: hamburger */}
        <Button
          variant="ghost"
          size="icon"
          className="md:hidden"
          onClick={() => setSidebarOpen(true)}
        >
          <MenuIcon className="size-4" />
          <span className="sr-only">Abrir menú</span>
        </Button>

        {/* Logo (mobile only — desktop shows in sidebar) */}
        <Link href="/" className="flex items-center gap-2 md:hidden">
          <TrophyIcon className="size-5 text-primary" />
          <span className="font-heading font-bold text-gradient-purple">GamingArena</span>
        </Link>

        <div className="flex-1" />

        {/* Right actions */}
        <div className="flex items-center gap-2">
          <RoleSwitcher />
          <NotificationsBell />

          {/* User menu */}
          <DropdownMenu>
            <DropdownMenuTrigger
              render={<Button variant="ghost" size="icon" className="rounded-full" />}
            >
              <Avatar
                src={
                  user?.activeRole === 'JUGADOR'
                    ? user?.jugadorProfile?.avatar
                    : user?.activeRole === 'TIENDA'
                    ? user?.tiendaProfile?.logo ?? null
                    : null
                }
                name={
                  user?.activeRole === 'JUGADOR'
                    ? user?.jugadorProfile?.nombre
                    : user?.activeRole === 'TIENDA'
                    ? user?.tiendaProfile?.nombre
                    : user?.email
                }
                size="sm"
              />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-52">
              <DropdownMenuLabel className="font-normal">
                <div className="flex flex-col gap-0.5">
                  <span className="font-semibold text-foreground">
                    {user?.activeRole === 'JUGADOR'
                      ? user?.jugadorProfile?.nombre
                      : user?.activeRole === 'TIENDA'
                      ? user?.tiendaProfile?.nombre
                      : user?.email}
                  </span>
                  <span className="text-xs text-muted-foreground">{user?.email}</span>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link href="/perfil">Mi perfil</Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={logout}
                disabled={isLogoutPending}
                className="text-destructive focus:text-destructive"
              >
                <LogOutIcon className="mr-2 size-4" />
                Cerrar sesión
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      {/* Mobile sidebar modal */}
      <Dialog open={sidebarOpen} onOpenChange={setSidebarOpen}>
        <DialogContent
          showCloseButton={false}
          className="fixed left-0 top-0 h-full max-w-[260px] translate-x-0 translate-y-0 rounded-none p-0 data-open:slide-in-from-left data-closed:slide-out-to-left"
        >
          <Sidebar onClose={() => setSidebarOpen(false)} />
        </DialogContent>
      </Dialog>
    </>
  );
}

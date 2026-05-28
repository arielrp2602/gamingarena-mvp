'use client';

import { BellIcon, CheckCheckIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { useNotificaciones } from '@/hooks/use-notificaciones';
import { formatDateTime } from '@/lib/utils';
import { useRouter } from 'next/navigation';

export function NotificationsBell() {
  const router = useRouter();
  const { notificaciones, unread, markRead, markAllRead } = useNotificaciones();

  const recent = notificaciones.slice(0, 8);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button variant="ghost" size="icon" className="relative" />
        }
      >
        <BellIcon className="size-4" />
        {unread > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex size-4 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
        <span className="sr-only">Notificaciones</span>
      </DropdownMenuTrigger>

      <DropdownMenuContent className="w-80" align="end">
        <div className="flex items-center justify-between px-2.5 py-2">
          <DropdownMenuLabel className="p-0 text-base">
            Notificaciones
          </DropdownMenuLabel>
          {unread > 0 && (
            <Button
              variant="ghost"
              size="xs"
              onClick={markAllRead}
              className="text-xs text-muted-foreground"
            >
              <CheckCheckIcon className="mr-1 size-3" />
              Marcar todas
            </Button>
          )}
        </div>
        <DropdownMenuSeparator />

        {recent.length === 0 ? (
          <div className="py-6 text-center text-sm text-muted-foreground">
            Sin notificaciones
          </div>
        ) : (
          recent.map((n) => (
            <DropdownMenuItem
              key={n.id}
              className={`flex-col items-start gap-0.5 ${!n.leida ? 'bg-primary/5' : ''}`}
              onClick={() => {
                markRead(n.id);
                if (n.link) router.push(n.link);
              }}
            >
              <span className="text-xs font-medium leading-snug">{n.mensaje}</span>
              <span className="text-xs text-muted-foreground">
                {formatDateTime(n.createdAt)}
              </span>
              {!n.leida && (
                <Badge variant="default" className="mt-0.5 h-4 text-[10px]">
                  Nueva
                </Badge>
              )}
            </DropdownMenuItem>
          ))
        )}

        {notificaciones.length > 8 && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => router.push('/notificaciones')}
              className="justify-center text-xs text-primary"
            >
              Ver todas
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

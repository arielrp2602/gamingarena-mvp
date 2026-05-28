'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboardIcon,
  TrophyIcon,
  BellIcon,
  UserIcon,
  ClipboardListIcon,
  StoreIcon,
  CalendarDaysIcon,
  ScaleIcon,
  AlertTriangleIcon,
  ShieldCheckIcon,
  Building2Icon,
  Gamepad2Icon,
  MessageSquareIcon,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/use-auth';
import type { Role } from '@/types';

const ICON_MAP = {
  LayoutDashboard: LayoutDashboardIcon,
  Trophy: TrophyIcon,
  Bell: BellIcon,
  User: UserIcon,
  ClipboardList: ClipboardListIcon,
  Store: StoreIcon,
  CalendarDays: CalendarDaysIcon,
  Scale: ScaleIcon,
  AlertTriangle: AlertTriangleIcon,
  ShieldCheck: ShieldCheckIcon,
  Building2: Building2Icon,
  Gamepad2: Gamepad2Icon,
  MessageSquare: MessageSquareIcon,
} as const;

interface SidebarItem {
  label: string;
  href: string;
  icon: keyof typeof ICON_MAP;
  roles?: Role[];
}

const NAV_ITEMS: SidebarItem[] = [
  { label: 'Inicio', href: '/dashboard', icon: 'LayoutDashboard' },
  { label: 'Torneos', href: '/torneos', icon: 'Trophy' },
  { label: 'Notificaciones', href: '/notificaciones', icon: 'Bell' },
  { label: 'Mi perfil', href: '/perfil', icon: 'User', roles: ['JUGADOR'] },
  { label: 'Mis inscripciones', href: '/mis-torneos', icon: 'ClipboardList', roles: ['JUGADOR'] },
  { label: 'Panel tienda', href: '/tienda', icon: 'Store', roles: ['TIENDA'] },
  { label: 'Mis torneos', href: '/tienda/torneos', icon: 'CalendarDays', roles: ['TIENDA'] },
  { label: 'Panel juez', href: '/juez', icon: 'Scale', roles: ['JUEZ'] },
  { label: 'Disputas', href: '/juez/disputas', icon: 'AlertTriangle', roles: ['JUEZ'] },
  { label: 'Admin', href: '/admin', icon: 'ShieldCheck', roles: ['ADMIN'] },
  { label: 'Tiendas', href: '/admin/tiendas', icon: 'Building2', roles: ['ADMIN'] },
  { label: 'Catálogo', href: '/admin/juegos', icon: 'Gamepad2', roles: ['ADMIN'] },
  { label: 'Feedback', href: '/admin/feedback', icon: 'MessageSquare', roles: ['ADMIN'] },
];

interface SidebarProps {
  onClose?: () => void;
}

export function Sidebar({ onClose }: SidebarProps) {
  const pathname = usePathname();
  const { user } = useAuth();
  const activeRole = user?.activeRole;

  const visibleItems = NAV_ITEMS.filter(
    (item) => !item.roles || (activeRole && item.roles.includes(activeRole)),
  );

  return (
    <div className="flex h-full flex-col gap-1 bg-sidebar px-3 py-4">
      {/* Logo */}
      <Link
        href="/"
        className="mb-4 flex items-center gap-2 px-2"
        onClick={onClose}
      >
        <div className="flex size-8 items-center justify-center rounded-lg bg-primary glow-purple-sm">
          <TrophyIcon className="size-4 text-primary-foreground" />
        </div>
        <span className="font-heading text-lg font-bold text-gradient-purple">
          GamingArena
        </span>
      </Link>

      {/* Nav items */}
      <nav className="flex flex-1 flex-col gap-0.5">
        {visibleItems.map((item) => {
          const Icon = ICON_MAP[item.icon];
          const isActive =
            item.href === '/dashboard'
              ? pathname === item.href
              : pathname.startsWith(item.href);

          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onClose}
              className={cn(
                'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                isActive
                  ? 'bg-sidebar-accent text-sidebar-primary glow-purple-sm'
                  : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
              )}
            >
              <Icon className="size-4 shrink-0" />
              {item.label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}

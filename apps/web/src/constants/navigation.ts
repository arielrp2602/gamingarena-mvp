import type { Role } from '@/types';

export interface NavItem {
  label: string;
  href: string;
  icon: string; // lucide icon name
  roles?: Role[];
}

export const DASHBOARD_NAV: NavItem[] = [
  // Todos los autenticados
  { label: 'Inicio', href: '/dashboard', icon: 'LayoutDashboard' },
  { label: 'Torneos', href: '/torneos', icon: 'Trophy' },
  { label: 'Notificaciones', href: '/notificaciones', icon: 'Bell' },

  // Solo JUGADOR
  { label: 'Mi perfil', href: '/perfil', icon: 'User', roles: ['JUGADOR'] },
  { label: 'Mis inscripciones', href: '/mis-torneos', icon: 'ClipboardList', roles: ['JUGADOR'] },

  // Solo TIENDA
  { label: 'Panel tienda', href: '/tienda', icon: 'Store', roles: ['TIENDA'] },
  { label: 'Mis torneos', href: '/tienda/torneos', icon: 'CalendarDays', roles: ['TIENDA'] },

  // Solo JUEZ
  { label: 'Panel juez', href: '/juez', icon: 'Scale', roles: ['JUEZ'] },
  { label: 'Disputas', href: '/juez/disputas', icon: 'AlertTriangle', roles: ['JUEZ'] },

  // Solo ADMIN
  { label: 'Admin', href: '/admin', icon: 'ShieldCheck', roles: ['ADMIN'] },
  { label: 'Tiendas', href: '/admin/tiendas', icon: 'Building2', roles: ['ADMIN'] },
  { label: 'Catálogo', href: '/admin/juegos', icon: 'Gamepad2', roles: ['ADMIN'] },
  { label: 'Feedback', href: '/admin/feedback', icon: 'MessageSquare', roles: ['ADMIN'] },
];

export const ROLE_LABELS: Record<Role, string> = {
  JUGADOR: 'Jugador',
  TIENDA: 'Tienda',
  JUEZ: 'Juez',
  ADMIN: 'Admin',
};

export const ROLE_COLORS: Record<Role, string> = {
  JUGADOR: 'bg-cyan-500/20 text-cyan-400',
  TIENDA: 'bg-purple-500/20 text-purple-400',
  JUEZ: 'bg-yellow-500/20 text-yellow-400',
  ADMIN: 'bg-red-500/20 text-red-400',
};

import Link from 'next/link';
import { TrophyIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col">
      {/* Public navbar */}
      <header className="sticky top-0 z-40 flex h-14 items-center gap-4 border-b border-border bg-background/80 px-4 backdrop-blur-sm md:px-6">
        <Link href="/" className="flex items-center gap-2">
          <div className="flex size-7 items-center justify-center rounded-lg bg-primary glow-purple-sm">
            <TrophyIcon className="size-4 text-primary-foreground" />
          </div>
          <span className="font-heading font-bold text-gradient-purple">GamingArena</span>
        </Link>

        <nav className="hidden items-center gap-4 text-sm md:flex">
          <Link href="/torneos" className="text-muted-foreground hover:text-foreground transition-colors">
            Torneos
          </Link>
        </nav>

        <div className="ml-auto flex items-center gap-2">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/login">Iniciar sesión</Link>
          </Button>
          <Button size="sm" asChild>
            <Link href="/register">Registrarse</Link>
          </Button>
        </div>
      </header>

      <main className="flex-1">{children}</main>

      <footer className="border-t border-border py-8 text-center text-sm text-muted-foreground">
        <p>© 2025 GamingArena · Todos los derechos reservados</p>
      </footer>
    </div>
  );
}

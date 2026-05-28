import Link from 'next/link';
import { TrophyIcon } from 'lucide-react';

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4 py-12">
      <Link href="/" className="mb-8 flex items-center gap-2">
        <div className="flex size-9 items-center justify-center rounded-xl bg-primary glow-purple">
          <TrophyIcon className="size-5 text-primary-foreground" />
        </div>
        <span className="font-heading text-2xl font-bold text-gradient-purple">
          GamingArena
        </span>
      </Link>
      <div className="w-full max-w-sm">{children}</div>
    </div>
  );
}

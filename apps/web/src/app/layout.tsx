import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import { Providers } from '@/components/providers';
import { Toaster } from '@/components/ui/toaster';
import './globals.css';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: {
    default: 'GamingArena',
    template: '%s | GamingArena',
  },
  description: 'La plataforma de torneos de TCG y videojuegos más completa de México.',
  openGraph: {
    title: 'GamingArena',
    description: 'Torneos de Yu-Gi-Oh!, Magic, Pokémon, Smash Bros, Valorant y más.',
    url: 'https://gamingarena.app',
    siteName: 'GamingArena',
    locale: 'es_MX',
    type: 'website',
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="es"
      className={`${geistSans.variable} ${geistMono.variable} dark`}
      suppressHydrationWarning
    >
      <body className="min-h-screen bg-background text-foreground antialiased">
        <Providers>{children}</Providers>
        <Toaster />
      </body>
    </html>
  );
}

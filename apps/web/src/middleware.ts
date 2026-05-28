import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const PUBLIC_PATHS = ['/', '/login', '/register', '/forgot-password'];
const PUBLIC_PREFIX = '/torneos/'; // /torneos/[id] es público

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Rutas públicas — pasan sin verificación
  const isPublic =
    PUBLIC_PATHS.includes(pathname) ||
    pathname.startsWith(PUBLIC_PREFIX) ||
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api/auth') ||
    pathname.startsWith('/icons') ||
    pathname.startsWith('/images');

  if (isPublic) return NextResponse.next();

  // Verificar cookie de sesión
  const token = request.cookies.get('access_token')?.value;

  if (!token) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};

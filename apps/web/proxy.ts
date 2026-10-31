import { NextRequest, NextResponse } from 'next/server';

const protectedRoutes = ['/dashboard', '/repositories', '/audits', '/issues'];

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const isProtectedRoute = protectedRoutes.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`),
  );

  if (!isProtectedRoute) {
    return NextResponse.next();
  }

  const session = request.cookies.get(
    process.env.COOKIE_NAME || 'codepilot_session',
  );

  if (!session?.value) {
    const url = request.nextUrl.clone();

    url.pathname = '/login';
    url.searchParams.set('from', pathname);

    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/dashboard/:path*',
    '/repositories/:path*',
    '/audits/:path*',
    '/issues/:path*',
  ],
};

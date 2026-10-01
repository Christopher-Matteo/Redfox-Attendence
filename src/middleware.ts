import { NextRequest, NextResponse } from 'next/server';

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Branch alias redirect: /branch/:code -> /attendance/:code
  if (pathname.startsWith('/branch/')) {
    const branchCode = pathname.replace('/branch/', '');
    const url = req.nextUrl.clone();
    url.pathname = `/attendance/${branchCode}`;
    return NextResponse.redirect(url);
  }

  // Admin route protection: Block unauthenticated users from /private-admin
  if (pathname.startsWith('/private-admin') && !pathname.startsWith('/private-admin/login')) {
    const cookie = req.cookies.get('redfox_admin_session');
    let hasSessionToken = false;

    if (cookie && cookie.value && cookie.value.includes('.')) {
      hasSessionToken = true;
    }

    if (!hasSessionToken) {
      const loginUrl = new URL('/private-admin/login', req.url);
      loginUrl.searchParams.set('redirect', pathname);
      return NextResponse.redirect(loginUrl);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/branch/:path*', '/private-admin/:path*'],
};

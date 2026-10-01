import { NextRequest, NextResponse } from 'next/server';
import { getAdminSession, AdminSession } from './auth';

const NO_CACHE_HEADERS = {
  'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0',
  Pragma: 'no-cache',
  Expires: '0',
};

export function jsonResponse(data: unknown, status = 200) {
  return NextResponse.json(data, {
    status,
    headers: NO_CACHE_HEADERS,
  });
}

export function errorResponse(message: string, status = 400) {
  return NextResponse.json(
    { error: message },
    {
      status,
      headers: NO_CACHE_HEADERS,
    }
  );
}

export function requireAdmin(
  req: NextRequest
): { session: AdminSession; errorResponse: null } | { session: null; errorResponse: NextResponse } {
  const session = getAdminSession(req);
  if (!session) {
    return {
      session: null,
      errorResponse: NextResponse.json(
        { error: 'Unauthorized. Admin authentication required.' },
        { status: 401 }
      ),
    };
  }
  return { session, errorResponse: null };
}

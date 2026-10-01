import { NextRequest, NextResponse } from 'next/server';
import { getAdminSession, AdminSession } from './auth';

export function jsonResponse(data: unknown, status = 200) {
  return NextResponse.json(data, { status });
}

export function errorResponse(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
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

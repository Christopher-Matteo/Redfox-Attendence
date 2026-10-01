import { NextRequest } from 'next/server';
import { requireAdmin, jsonResponse } from '@/lib/api-helpers';

export async function GET(req: NextRequest) {
  const { session, errorResponse } = requireAdmin(req);
  if (errorResponse) return errorResponse;

  return jsonResponse({
    authenticated: true,
    admin: session,
  });
}

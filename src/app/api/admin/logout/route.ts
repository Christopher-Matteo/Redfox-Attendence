import { NextResponse } from 'next/server';
import { clearAdminSessionCookie } from '@/lib/auth';
import { jsonResponse } from '@/lib/api-helpers';

export async function POST() {
  const res = jsonResponse({ success: true, message: 'Logged out successfully' });
  clearAdminSessionCookie(res);
  return res;
}

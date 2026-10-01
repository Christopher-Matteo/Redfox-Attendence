import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';

const SESSION_COOKIE_NAME = 'redfox_admin_session';
const SESSION_SECRET = process.env.ADMIN_SESSION_SECRET || 'redfox_secret_key_attendance_mgmt_2026_x89q';

export interface AdminSession {
  id: number;
  username: string;
  fullName: string;
  exp: number;
}

export function signToken(payload: object): string {
  const data = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const signature = crypto.createHmac('sha256', SESSION_SECRET).update(data).digest('base64url');
  return `${data}.${signature}`;
}

export function verifyToken<T>(token: string): T | null {
  try {
    const [data, signature] = token.split('.');
    if (!data || !signature) return null;
    const expectedSignature = crypto.createHmac('sha256', SESSION_SECRET).update(data).digest('base64url');
    if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature))) {
      return null;
    }
    const decoded = JSON.parse(Buffer.from(data, 'base64url').toString('utf8'));
    if (decoded.exp && decoded.exp < Date.now()) {
      return null; // Expired
    }
    return decoded as T;
  } catch {
    return null;
  }
}

export function getAdminSession(req: NextRequest): AdminSession | null {
  const cookie = req.cookies.get(SESSION_COOKIE_NAME);
  if (!cookie || !cookie.value) return null;
  return verifyToken<AdminSession>(cookie.value);
}

export function setAdminSessionCookie(res: NextResponse, admin: { id: number; username: string; full_name: string }) {
  // Session lasts 7 days
  const exp = Date.now() + 7 * 24 * 60 * 60 * 1000;
  const token = signToken({
    id: admin.id,
    username: admin.username,
    fullName: admin.full_name,
    exp,
  });

  res.cookies.set({
    name: SESSION_COOKIE_NAME,
    value: token,
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 7 * 24 * 60 * 60,
  });
}

export function clearAdminSessionCookie(res: NextResponse) {
  res.cookies.set({
    name: SESSION_COOKIE_NAME,
    value: '',
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
  });
}

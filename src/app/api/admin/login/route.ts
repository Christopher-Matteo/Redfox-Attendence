import { NextRequest, NextResponse } from 'next/server';
import { getDb, verifyPassword } from '@/lib/db';
import { setAdminSessionCookie } from '@/lib/auth';
import { errorResponse, jsonResponse } from '@/lib/api-helpers';

export async function POST(req: NextRequest) {
  try {
    const { username, password } = await req.json();

    if (!username || !password) {
      return errorResponse('Username and password are required', 400);
    }

    const db = await getDb();
    const admin = db.prepare('SELECT * FROM admins WHERE username = ?').get(username) as {
      id: number;
      username: string;
      password_hash: string;
      password_salt: string;
      full_name: string;
    } | undefined;

    if (!admin) {
      return errorResponse('Invalid username or password', 401);
    }

    const isValid = verifyPassword(password, admin.password_hash, admin.password_salt);
    if (!isValid) {
      return errorResponse('Invalid username or password', 401);
    }

    const res = jsonResponse({
      success: true,
      admin: {
        id: admin.id,
        username: admin.username,
        fullName: admin.full_name,
      },
    });

    setAdminSessionCookie(res, admin);
    return res;
  } catch (error) {
    console.error('Admin login error:', error);
    return errorResponse('Internal server error', 500);
  }
}

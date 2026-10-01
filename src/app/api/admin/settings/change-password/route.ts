import { NextRequest } from 'next/server';
import { getDb, hashPassword, verifyPassword } from '@/lib/db';
import { requireAdmin, errorResponse, jsonResponse } from '@/lib/api-helpers';

export async function POST(req: NextRequest) {
  const auth = requireAdmin(req);
  if (auth.errorResponse) return auth.errorResponse;
  const session = auth.session;

  try {
    const { currentPassword, newPassword } = await req.json();

    if (!currentPassword || !newPassword) {
      return errorResponse('Current password and new password are required', 400);
    }

    if (newPassword.length < 6) {
      return errorResponse('New password must be at least 6 characters long', 400);
    }

    const db = getDb();
    const admin = db.prepare('SELECT * FROM admins WHERE id = ?').get(session.id) as any;

    if (!admin) return errorResponse('Admin user not found', 404);

    const validCurrent = verifyPassword(currentPassword, admin.password_hash, admin.password_salt);
    if (!validCurrent) {
      return errorResponse('Current password is incorrect', 400);
    }

    const { hash, salt } = hashPassword(newPassword);
    db.prepare('UPDATE admins SET password_hash = ?, password_salt = ? WHERE id = ?').run(hash, salt, session.id);

    return jsonResponse({
      success: true,
      message: 'Admin password changed successfully',
    });
  } catch (error) {
    console.error('Password change error:', error);
    return errorResponse('Internal server error', 500);
  }
}

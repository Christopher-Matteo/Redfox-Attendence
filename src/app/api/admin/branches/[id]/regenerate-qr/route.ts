import { NextRequest } from 'next/server';
import crypto from 'crypto';
import { getDb } from '@/lib/db';
import { requireAdmin, errorResponse, jsonResponse } from '@/lib/api-helpers';

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { errorResponse: authError } = requireAdmin(req);
  if (authError) return authError;

  const resolvedParams = await params;
  const branchId = parseInt(resolvedParams.id, 10);
  if (isNaN(branchId)) return errorResponse('Invalid branch ID', 400);

  const db = await getDb();
  const branch = db.prepare('SELECT * FROM branches WHERE id = ?').get(branchId);
  if (!branch) return errorResponse('Branch not found', 404);

  const newQrToken = crypto.randomUUID();
  const now = new Date().toISOString();

  db.prepare('UPDATE branches SET qr_token = ?, updated_at = ? WHERE id = ?').run(newQrToken, now, branchId);

  return jsonResponse({
    success: true,
    message: 'QR token regenerated successfully',
    qr_token: newQrToken,
  });
}

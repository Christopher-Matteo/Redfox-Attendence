import { NextRequest } from 'next/server';
import { getDb } from '@/lib/db';
import { requireAdmin, errorResponse, jsonResponse } from '@/lib/api-helpers';

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { errorResponse: authError } = requireAdmin(req);
  if (authError) return authError;

  const resolvedParams = await params;
  const branchId = parseInt(resolvedParams.id, 10);
  if (isNaN(branchId)) return errorResponse('Invalid branch ID', 400);

  try {
    const { name, code, status } = await req.json();

    if (!name || !code) {
      return errorResponse('Branch name and code are required', 400);
    }

    const cleanCode = code.trim().toLowerCase().replace(/[^a-z0-9-_]/g, '-');
    const validStatus = status === 'inactive' ? 'inactive' : 'active';

    const db = await getDb();

    // Check code uniqueness excluding this branch
    const duplicate = db.prepare('SELECT id FROM branches WHERE code = ? AND id != ?').get(cleanCode, branchId);
    if (duplicate) {
      return errorResponse(`Branch code "${cleanCode}" is already in use by another branch`, 409);
    }

    const now = new Date().toISOString();
    db.prepare(`
      UPDATE branches
      SET name = ?, code = ?, status = ?, updated_at = ?
      WHERE id = ?
    `).run(name.trim(), cleanCode, validStatus, now, branchId);

    const updated = db.prepare('SELECT * FROM branches WHERE id = ?').get(branchId);
    return jsonResponse({ success: true, branch: updated });
  } catch (error) {
    console.error('Error updating branch:', error);
    return errorResponse('Internal server error', 500);
  }
}

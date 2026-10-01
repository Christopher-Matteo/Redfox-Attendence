import { NextRequest } from 'next/server';
import { getDb } from '@/lib/db';
import { requireAdmin, errorResponse, jsonResponse } from '@/lib/api-helpers';

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { errorResponse: authError } = requireAdmin(req);
  if (authError) return authError;

  const resolvedParams = await params;
  const shiftId = parseInt(resolvedParams.id, 10);
  if (isNaN(shiftId)) return errorResponse('Invalid shift ID', 400);

  try {
    const { name, start_time, end_time } = await req.json();

    if (!name || !start_time || !end_time) {
      return errorResponse('Shift name, start time, and end time are required', 400);
    }

    const now = new Date().toISOString();
    const db = getDb();

    db.prepare(`
      UPDATE shifts
      SET name = ?, start_time = ?, end_time = ?, updated_at = ?
      WHERE id = ?
    `).run(name.trim(), start_time.trim(), end_time.trim(), now, shiftId);

    const updated = db.prepare('SELECT * FROM shifts WHERE id = ?').get(shiftId);
    return jsonResponse({ success: true, shift: updated });
  } catch (error) {
    console.error('Error updating shift:', error);
    return errorResponse('Internal server error', 500);
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { errorResponse: authError } = requireAdmin(req);
  if (authError) return authError;

  const resolvedParams = await params;
  const shiftId = parseInt(resolvedParams.id, 10);
  if (isNaN(shiftId)) return errorResponse('Invalid shift ID', 400);

  const db = getDb();
  // Check if assigned to any employees
  const assigned = db.prepare('SELECT COUNT(*) as count FROM employees WHERE shift_id = ?').get(shiftId) as { count: number };
  if (assigned && assigned.count > 0) {
    return errorResponse(`Cannot delete shift: It is assigned to ${assigned.count} employee(s). Please reassign them first.`, 400);
  }

  db.prepare('DELETE FROM shifts WHERE id = ?').run(shiftId);
  return jsonResponse({ success: true, message: 'Shift deleted successfully' });
}

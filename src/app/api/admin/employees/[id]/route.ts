import { NextRequest } from 'next/server';
import { getDb } from '@/lib/db';
import { requireAdmin, errorResponse, jsonResponse } from '@/lib/api-helpers';

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { errorResponse: authError } = requireAdmin(req);
  if (authError) return authError;

  const resolvedParams = await params;
  const empId = parseInt(resolvedParams.id, 10);
  if (isNaN(empId)) return errorResponse('Invalid employee ID', 400);

  try {
    const { full_name, branch_id, shift_id, weekly_off, status } = await req.json();

    if (!full_name || !branch_id || !shift_id) {
      return errorResponse('Full name, branch, and shift are required', 400);
    }

    const validWeeklyOff = [
      'Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'
    ].includes(weekly_off) ? weekly_off : 'Sunday';

    const validStatus = status === 'inactive' ? 'inactive' : 'active';
    const now = new Date().toISOString();

    const db = await getDb();
    db.prepare(`
      UPDATE employees
      SET full_name = ?, branch_id = ?, shift_id = ?, weekly_off = ?, status = ?, updated_at = ?
      WHERE id = ?
    `).run(full_name.trim(), branch_id, shift_id, validWeeklyOff, validStatus, now, empId);

    const updated = db.prepare(`
      SELECT e.*, b.name as branch_name, s.name as shift_name
      FROM employees e
      JOIN branches b ON e.branch_id = b.id
      JOIN shifts s ON e.shift_id = s.id
      WHERE e.id = ?
    `).get(empId);

    return jsonResponse({ success: true, employee: updated });
  } catch (error) {
    console.error('Error updating employee:', error);
    return errorResponse('Internal server error', 500);
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { errorResponse: authError } = requireAdmin(req);
  if (authError) return authError;

  const resolvedParams = await params;
  const empId = parseInt(resolvedParams.id, 10);
  if (isNaN(empId)) return errorResponse('Invalid employee ID', 400);

  const db = await getDb();
  const emp = db.prepare('SELECT status FROM employees WHERE id = ?').get(empId) as { status: string } | undefined;
  if (!emp) return errorResponse('Employee not found', 404);

  // Toggle status
  const newStatus = emp.status === 'active' ? 'inactive' : 'active';
  const now = new Date().toISOString();

  db.prepare('UPDATE employees SET status = ?, updated_at = ? WHERE id = ?').run(newStatus, now, empId);

  return jsonResponse({
    success: true,
    message: `Employee ${newStatus === 'active' ? 'activated' : 'deactivated'} successfully`,
    status: newStatus,
  });
}

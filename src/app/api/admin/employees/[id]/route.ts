import { NextRequest } from 'next/server';
import { getDb } from '@/lib/db';
import { requireAdmin, errorResponse, jsonResponse } from '@/lib/api-helpers';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { errorResponse: authError } = requireAdmin(req);
  if (authError) return authError;

  const resolvedParams = await params;
  const empId = parseInt(resolvedParams.id, 10);
  if (isNaN(empId) || empId <= 0) return errorResponse('Invalid employee ID', 400);

  const db = await getDb();
  const employee = db.prepare(`
    SELECT 
      e.id,
      e.full_name,
      e.branch_id,
      e.shift_id,
      e.weekly_off,
      e.status,
      e.created_at,
      e.updated_at,
      COALESCE(b.name, 'Unassigned Branch') as branch_name,
      COALESCE(b.code, '') as branch_code,
      COALESCE(s.name, 'Unassigned Shift') as shift_name,
      COALESCE(s.start_time, '09:00') as shift_start,
      COALESCE(s.end_time, '19:00') as shift_end
    FROM employees e
    LEFT JOIN branches b ON e.branch_id = b.id
    LEFT JOIN shifts s ON e.shift_id = s.id
    WHERE e.id = ?
  `).get(empId);

  if (!employee) return errorResponse('Employee not found', 404);
  return jsonResponse({ employee });
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { errorResponse: authError } = requireAdmin(req);
  if (authError) return authError;

  const resolvedParams = await params;
  const empId = parseInt(resolvedParams.id, 10);
  if (isNaN(empId) || empId <= 0) return errorResponse('Invalid employee ID', 400);

  try {
    const body = await req.json();
    const fullName = typeof body.full_name === 'string' ? body.full_name.trim() : '';
    const branchId = parseInt(body.branch_id, 10);
    const shiftId = parseInt(body.shift_id, 10);
    const weeklyOff = body.weekly_off;
    const status = body.status === 'inactive' ? 'inactive' : 'active';

    if (!fullName) {
      return errorResponse('Full name is required', 400);
    }
    if (isNaN(branchId) || branchId <= 0) {
      return errorResponse('A valid branch must be selected', 400);
    }
    if (isNaN(shiftId) || shiftId <= 0) {
      return errorResponse('A valid shift must be selected', 400);
    }

    const db = await getDb();

    // Verify employee exists
    const existingEmp = db.prepare('SELECT id FROM employees WHERE id = ?').get(empId);
    if (!existingEmp) {
      return errorResponse('Employee not found', 404);
    }

    // Verify branch exists
    const branch = db.prepare('SELECT id, name FROM branches WHERE id = ?').get(branchId) as { id: number; name: string } | undefined;
    if (!branch) {
      return errorResponse('The selected branch does not exist', 400);
    }

    // Verify shift exists
    const shift = db.prepare('SELECT id, name FROM shifts WHERE id = ?').get(shiftId) as { id: number; name: string } | undefined;
    if (!shift) {
      return errorResponse('The selected shift does not exist', 400);
    }

    const validWeeklyOff = [
      'Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'
    ].includes(weeklyOff) ? weeklyOff : 'Sunday';

    const now = new Date().toISOString();

    db.prepare(`
      UPDATE employees
      SET full_name = ?, branch_id = ?, shift_id = ?, weekly_off = ?, status = ?, updated_at = ?
      WHERE id = ?
    `).run(fullName, branchId, shiftId, validWeeklyOff, status, now, empId);

    // TODAY'S ATTENDANCE SYNC:
    // If an attendance record exists for today and employee has NOT checked in yet (or is auto-marked absent),
    // sync today's attendance record with the newly assigned branch and shift so all today views reflect it.
    // Historical attendance for past dates is strictly preserved.
    const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(new Date());
    db.prepare(`
      UPDATE attendance
      SET branch_id = ?, shift_name = ?, updated_at = ?
      WHERE employee_id = ? AND attendance_date = ? AND check_in_time IS NULL
    `).run(branchId, shift.name, now, empId, today);

    const updated = db.prepare(`
      SELECT 
        e.id,
        e.full_name,
        e.branch_id,
        e.shift_id,
        e.weekly_off,
        e.status,
        e.created_at,
        e.updated_at,
        COALESCE(b.name, 'Unassigned Branch') as branch_name,
        COALESCE(b.code, '') as branch_code,
        COALESCE(s.name, 'Unassigned Shift') as shift_name,
        COALESCE(s.start_time, '09:00') as shift_start,
        COALESCE(s.end_time, '19:00') as shift_end
      FROM employees e
      LEFT JOIN branches b ON e.branch_id = b.id
      LEFT JOIN shifts s ON e.shift_id = s.id
      WHERE e.id = ?
    `).get(empId);

    return jsonResponse({ success: true, employee: updated, message: 'Employee updated successfully' });
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
  if (isNaN(empId) || empId <= 0) return errorResponse('Invalid employee ID', 400);

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

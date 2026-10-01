import { NextRequest } from 'next/server';
import { getDb } from '@/lib/db';
import { requireAdmin, errorResponse, jsonResponse } from '@/lib/api-helpers';

export async function POST(req: NextRequest) {
  const { errorResponse: authError } = requireAdmin(req);
  if (authError) return authError;

  try {
    const { employeeId, date, status, checkInTime, checkOutTime, shiftName, adminNotes } = await req.json();

    if (!employeeId || !date || !status) {
      return errorResponse('Employee ID, date (YYYY-MM-DD), and status are required', 400);
    }

    const db = getDb();
    const emp = db.prepare(`
      SELECT e.*, b.id as branch_id, s.name as shift_name
      FROM employees e
      JOIN branches b ON e.branch_id = b.id
      JOIN shifts s ON e.shift_id = s.id
      WHERE e.id = ?
    `).get(employeeId) as any;

    if (!emp) return errorResponse('Employee not found', 404);

    const now = new Date().toISOString();
    const finalShift = shiftName || emp.shift_name;

    // Check if record already exists
    const existing = db.prepare('SELECT id FROM attendance WHERE employee_id = ? AND attendance_date = ?').get(employeeId, date) as { id: number } | undefined;

    if (existing) {
      db.prepare(`
        UPDATE attendance SET
          attendance_status = ?,
          check_in_time = ?,
          check_out_time = ?,
          shift_name = ?,
          admin_notes = ?,
          manual_override = 1,
          updated_by_admin = 1,
          updated_at = ?
        WHERE id = ?
      `).run(
        status,
        checkInTime || null,
        checkOutTime || null,
        finalShift,
        adminNotes || null,
        now,
        existing.id
      );
    } else {
      db.prepare(`
        INSERT INTO attendance (
          employee_id, branch_id, attendance_date, shift_name,
          check_in_time, check_out_time, check_in_verification, check_out_verification,
          attendance_status, manual_override, updated_by_admin, admin_notes, created_at, updated_at
        ) VALUES (
          ?, ?, ?, ?,
          ?, ?, 'Verified', 'Verified',
          ?, 1, 1, ?, ?, ?
        )
      `).run(
        emp.id,
        emp.branch_id,
        date,
        finalShift,
        checkInTime || null,
        checkOutTime || null,
        status,
        adminNotes || null,
        now,
        now
      );
    }

    return jsonResponse({
      success: true,
      message: 'Attendance record updated successfully by admin',
    });
  } catch (error) {
    console.error('Error creating manual attendance:', error);
    return errorResponse('Internal server error', 500);
  }
}

import { NextRequest } from 'next/server';
import { getDb } from '@/lib/db';
import { requireAdmin, errorResponse, jsonResponse } from '@/lib/api-helpers';

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { errorResponse: authError } = requireAdmin(req);
  if (authError) return authError;

  const resolvedParams = await params;
  const attendanceId = parseInt(resolvedParams.id, 10);
  if (isNaN(attendanceId)) return errorResponse('Invalid attendance ID', 400);

  try {
    const { status, check_in_time, check_out_time, shift_name, admin_notes } = await req.json();

    const allowedStatuses = ['Present', 'Absent', 'Week Off', 'Leave', 'Half Day', 'Pending'];
    if (status && !allowedStatuses.includes(status)) {
      return errorResponse('Invalid attendance status', 400);
    }

    const db = await getDb();
    const existing = db.prepare('SELECT * FROM attendance WHERE id = ?').get(attendanceId);
    if (!existing) {
      return errorResponse('Attendance record not found', 404);
    }

    const now = new Date().toISOString();

    db.prepare(`
      UPDATE attendance SET
        attendance_status = COALESCE(?, attendance_status),
        check_in_time = COALESCE(?, check_in_time),
        check_out_time = COALESCE(?, check_out_time),
        shift_name = COALESCE(?, shift_name),
        admin_notes = COALESCE(?, admin_notes),
        manual_override = 1,
        updated_by_admin = 1,
        updated_at = ?
      WHERE id = ?
    `).run(
      status || null,
      check_in_time !== undefined ? check_in_time : null,
      check_out_time !== undefined ? check_out_time : null,
      shift_name || null,
      admin_notes !== undefined ? admin_notes : null,
      now,
      attendanceId
    );

    const updated = db.prepare(`
      SELECT a.*, e.full_name as employee_name, b.name as branch_name
      FROM attendance a
      JOIN employees e ON a.employee_id = e.id
      JOIN branches b ON a.branch_id = b.id
      WHERE a.id = ?
    `).get(attendanceId);

    return jsonResponse({ success: true, attendance: updated });
  } catch (error) {
    console.error('Error updating attendance:', error);
    return errorResponse('Internal server error', 500);
  }
}

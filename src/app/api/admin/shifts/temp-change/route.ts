import { NextRequest } from 'next/server';
import { getDb } from '@/lib/db';
import { requireAdmin, errorResponse, jsonResponse } from '@/lib/api-helpers';

export async function POST(req: NextRequest) {
  const { errorResponse: authError } = requireAdmin(req);
  if (authError) return authError;

  try {
    const { employee_id, shift_id, effective_date } = await req.json();

    if (!employee_id || !shift_id || !effective_date) {
      return errorResponse('Employee ID, shift ID, and effective date (YYYY-MM-DD) are required', 400);
    }

    const db = getDb();
    const now = new Date().toISOString();

    // Upsert into employee_shift_changes
    db.prepare(`
      INSERT INTO employee_shift_changes (employee_id, shift_id, effective_date, created_at)
      VALUES (?, ?, ?, ?)
      ON CONFLICT(employee_id, effective_date) DO UPDATE SET
        shift_id = excluded.shift_id,
        created_at = excluded.created_at
    `).run(employee_id, shift_id, effective_date, now);

    // If attendance record already exists for this date, also update shift_name
    const shift = db.prepare('SELECT name FROM shifts WHERE id = ?').get(shift_id) as { name: string } | undefined;
    if (shift) {
      db.prepare(`
        UPDATE attendance
        SET shift_name = ?, updated_at = ?
        WHERE employee_id = ? AND attendance_date = ?
      `).run(shift.name, now, employee_id, effective_date);
    }

    return jsonResponse({
      success: true,
      message: 'Temporary shift change scheduled successfully',
    });
  } catch (error) {
    console.error('Error creating temporary shift change:', error);
    return errorResponse('Internal server error', 500);
  }
}

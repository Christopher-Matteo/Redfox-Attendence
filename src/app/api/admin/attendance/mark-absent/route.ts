import { NextRequest } from 'next/server';
import { getDb } from '@/lib/db';
import { requireAdmin, errorResponse, jsonResponse } from '@/lib/api-helpers';

const DAYS_OF_WEEK = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export async function POST(req: NextRequest) {
  const { errorResponse: authError } = requireAdmin(req);
  if (authError) return authError;

  try {
    const { branchId, date } = await req.json();

    if (!date) {
      return errorResponse('Date (YYYY-MM-DD) is required', 400);
    }

    const db = getDb();
    const now = new Date().toISOString();

    // Determine day of week
    const [year, month, day] = date.split('-').map(Number);
    const dateObj = new Date(year, month - 1, day);
    const dayName = DAYS_OF_WEEK[dateObj.getDay()];

    // Get active employees for this branch (or all branches if branchId is 'all')
    let empQuery = `
      SELECT e.id, e.branch_id, e.weekly_off, s.name as shift_name
      FROM employees e
      JOIN shifts s ON e.shift_id = s.id
      WHERE e.status = 'active'
    `;
    const params: unknown[] = [];
    if (branchId && branchId !== 'all') {
      empQuery += ` AND e.branch_id = ?`;
      params.push(parseInt(branchId, 10));
    }

    const employees = db.prepare(empQuery).all(...params) as any[];

    // Fetch existing attendance records for this date
    const existing = db.prepare('SELECT employee_id, attendance_status, check_in_time FROM attendance WHERE attendance_date = ?').all(date) as any[];
    const existingMap = new Map<number, any>();
    for (const r of existing) {
      existingMap.set(r.employee_id, r);
    }

    let markedCount = 0;

    const insertStmt = db.prepare(`
      INSERT INTO attendance (
        employee_id, branch_id, attendance_date, shift_name,
        attendance_status, manual_override, updated_by_admin, created_at, updated_at
      ) VALUES (?, ?, ?, ?, 'Absent', 1, 1, ?, ?)
    `);

    const updateStmt = db.prepare(`
      UPDATE attendance SET
        attendance_status = 'Absent',
        manual_override = 1,
        updated_by_admin = 1,
        updated_at = ?
      WHERE employee_id = ? AND attendance_date = ?
    `);

    db.transaction(() => {
      for (const emp of employees) {
        const rec = existingMap.get(emp.id);
        const isWeekOff = emp.weekly_off.toLowerCase() === dayName.toLowerCase();

        // If today is employee's normal week off, don't mark absent unless desired
        if (isWeekOff && !rec) {
          continue; // Leave as normal week off
        }

        if (!rec) {
          // No record at all -> Insert as Absent
          insertStmt.run(emp.id, emp.branch_id, date, emp.shift_name, now, now);
          markedCount++;
        } else if (!rec.check_in_time && (!rec.attendance_status || rec.attendance_status === 'Not Marked' || rec.attendance_status === 'Pending')) {
          // Record exists but no check-in and unverified/unmarked status -> update to Absent
          updateStmt.run(now, emp.id, date);
          markedCount++;
        }
      }
    })();

    return jsonResponse({
      success: true,
      message: `Successfully marked ${markedCount} unmarked employee(s) as Absent.`,
      markedCount,
    });
  } catch (error) {
    console.error('Error marking absent:', error);
    return errorResponse('Internal server error', 500);
  }
}

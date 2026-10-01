import { NextRequest } from 'next/server';
import { getDb } from '@/lib/db';
import { saveTemporaryPhoto } from '@/lib/photos';
import { errorResponse, jsonResponse } from '@/lib/api-helpers';

function formatTimeTo12Hour(timeStr: string): string {
  try {
    const [h, m] = timeStr.split(':').map(Number);
    const period = h >= 12 ? 'PM' : 'AM';
    const hours12 = h % 12 || 12;
    const minutesFormatted = m.toString().padStart(2, '0');
    return `${hours12}:${minutesFormatted} ${period}`;
  } catch {
    return timeStr;
  }
}

export async function POST(req: NextRequest) {
  try {
    const { employeeId, branchId, photoBase64 } = await req.json();

    if (!employeeId || !branchId) {
      return errorResponse('Employee and branch are required', 400);
    }

    if (!photoBase64 || typeof photoBase64 !== 'string') {
      return errorResponse('Attendance photo is required directly from device camera', 400);
    }

    const db = await getDb();
    const empId = parseInt(employeeId, 10);
    const brId = parseInt(branchId, 10);

    // Validate active employee in branch
    const employee = db.prepare(`
      SELECT e.*, b.name as branch_name, s.name as default_shift_name
      FROM employees e
      JOIN branches b ON e.branch_id = b.id
      JOIN shifts s ON e.shift_id = s.id
      WHERE e.id = ? AND e.branch_id = ? AND e.status = 'active'
    `).get(empId, brId) as {
      id: number;
      full_name: string;
      shift_id: number;
      default_shift_name: string;
    } | undefined;

    if (!employee) {
      return errorResponse('Employee is not active or not registered at this branch', 400);
    }

    // Determine current date and time (using local timezone)
    const now = new Date();
    const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(now);
    const currentTime = now.toLocaleTimeString('en-GB', { timeZone: 'Asia/Kolkata', hour12: false }); // "08:58:12"
    const timeFormatted = formatTimeTo12Hour(currentTime);

    // Check duplicate check-in today
    const existing = db.prepare(`
      SELECT * FROM attendance WHERE employee_id = ? AND attendance_date = ?
    `).get(empId, today) as {
      id: number;
      check_in_time: string | null;
    } | undefined;

    if (existing && existing.check_in_time) {
      const existing12H = formatTimeTo12Hour(existing.check_in_time);
      return errorResponse(`You have already checked in at ${existing12H}.`, 400);
    }

    // Determine shift for today (check temporary shift changes first)
    const tempShift = db.prepare(`
      SELECT s.name FROM employee_shift_changes esc
      JOIN shifts s ON esc.shift_id = s.id
      WHERE esc.employee_id = ? AND esc.effective_date = ?
    `).get(empId, today) as { name: string } | undefined;

    const activeShiftName = tempShift ? tempShift.name : employee.default_shift_name;

    // Save temporary photo safely to private directory
    const photoFilename = saveTemporaryPhoto(photoBase64, 'cin');
    const isoNow = now.toISOString();

    if (existing) {
      // Update existing record
      db.prepare(`
        UPDATE attendance SET
          branch_id = ?,
          shift_name = ?,
          check_in_time = ?,
          check_in_photo = ?,
          check_in_verification = 'Pending',
          updated_at = ?
        WHERE id = ?
      `).run(brId, activeShiftName, currentTime, photoFilename, isoNow, existing.id);
    } else {
      // Insert new attendance record
      db.prepare(`
        INSERT INTO attendance (
          employee_id, branch_id, attendance_date, shift_name,
          check_in_time, check_in_photo, check_in_verification,
          attendance_status, manual_override, updated_by_admin, created_at, updated_at
        ) VALUES (
          ?, ?, ?, ?,
          ?, ?, 'Pending',
          'Pending', 0, 0, ?, ?
        )
      `).run(
        empId,
        brId,
        today,
        activeShiftName,
        currentTime,
        photoFilename,
        isoNow,
        isoNow
      );
    }

    return jsonResponse({
      success: true,
      message: 'Check-in submitted successfully.',
      time: timeFormatted,
      date: today,
    });
  } catch (error) {
    console.error('Check-in error:', error);
    return errorResponse('Failed to record check-in. Please try again.', 500);
  }
}

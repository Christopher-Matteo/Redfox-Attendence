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

    const employee = db.prepare(`
      SELECT e.*, b.name as branch_name, s.start_time, s.end_time, s.name as shift_name
      FROM employees e
      JOIN branches b ON e.branch_id = b.id
      JOIN shifts s ON e.shift_id = s.id
      WHERE e.id = ? AND e.branch_id = ? AND e.status = 'active'
    `).get(empId, brId) as {
      id: number;
      full_name: string;
      start_time: string;
      end_time: string;
      shift_name: string;
    } | undefined;

    if (!employee) {
      return errorResponse('Employee is not active or not registered at this branch', 400);
    }

    const now = new Date();
    const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(now);
    const currentTime = now.toLocaleTimeString('en-GB', { timeZone: 'Asia/Kolkata', hour12: false });
    const currentHour = parseInt(currentTime.split(':')[0], 10);

    // Check today's record
    let targetRecord = db.prepare(`
      SELECT * FROM attendance WHERE employee_id = ? AND attendance_date = ?
    `).get(empId, today) as {
      id: number;
      check_in_time: string | null;
      check_out_time: string | null;
      shift_name: string | null;
      attendance_date: string;
    } | undefined;

    // Overnight shift handling:
    // If it's early morning (e.g. before 13:00) and no today check-in exists (or already has check-in today),
    // check if yesterday had an overnight shift with check-in and NO check-out yet.
    if ((!targetRecord || !targetRecord.check_in_time) && currentHour < 13) {
      const yesterdayDateObj = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      const yesterday = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(yesterdayDateObj);

      const yesterdayRecord = db.prepare(`
        SELECT * FROM attendance 
        WHERE employee_id = ? AND attendance_date = ? AND check_in_time IS NOT NULL AND check_out_time IS NULL
      `).get(empId, yesterday) as {
        id: number;
        check_in_time: string | null;
        check_out_time: string | null;
        shift_name: string | null;
        attendance_date: string;
      } | undefined;

      if (yesterdayRecord) {
        targetRecord = yesterdayRecord;
      }
    }

    if (!targetRecord || !targetRecord.check_in_time) {
      return errorResponse('No check-in found for today. Please contact admin.', 400);
    }

    if (targetRecord.check_out_time) {
      const existing12H = formatTimeTo12Hour(targetRecord.check_out_time);
      return errorResponse(`You have already checked out at ${existing12H}.`, 400);
    }

    // Save temporary photo safely to private directory
    const photoFilename = saveTemporaryPhoto(photoBase64, 'cout');
    const isoNow = now.toISOString();

    db.prepare(`
      UPDATE attendance SET
        check_out_time = ?,
        check_out_photo = ?,
        check_out_verification = 'Pending',
        updated_at = ?
      WHERE id = ?
    `).run(currentTime, photoFilename, isoNow, targetRecord.id);

    return jsonResponse({
      success: true,
      message: 'Check-out submitted successfully.',
      time: formatTimeTo12Hour(currentTime),
      date: targetRecord.attendance_date,
    });
  } catch (error) {
    console.error('Check-out error:', error);
    return errorResponse('Failed to record check-out. Please try again.', 500);
  }
}

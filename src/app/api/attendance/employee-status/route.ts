import { NextRequest } from 'next/server';
import { getDb } from '@/lib/db';
import { errorResponse, jsonResponse } from '@/lib/api-helpers';

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const employeeId = url.searchParams.get('employeeId');

  if (!employeeId) {
    return errorResponse('Employee ID is required', 400);
  }

  const db = await getDb();
  const empId = parseInt(employeeId, 10);

  // Form today's date in local YYYY-MM-DD
  const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(new Date());

  // Check today's record
  const record = db.prepare(`
    SELECT check_in_time, check_out_time, attendance_status, check_in_verification, check_out_verification
    FROM attendance
    WHERE employee_id = ? AND attendance_date = ?
  `).get(empId, today) as {
    check_in_time: string | null;
    check_out_time: string | null;
    attendance_status: string | null;
    check_in_verification: string | null;
    check_out_verification: string | null;
  } | undefined;

  return jsonResponse({
    date: today,
    hasCheckedIn: !!record?.check_in_time,
    checkInTime: record?.check_in_time || null,
    hasCheckedOut: !!record?.check_out_time,
    checkOutTime: record?.check_out_time || null,
    status: record?.attendance_status || null,
  });
}

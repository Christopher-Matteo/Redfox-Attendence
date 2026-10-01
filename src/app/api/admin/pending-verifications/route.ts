import { NextRequest } from 'next/server';
import { getDb } from '@/lib/db';
import { requireAdmin, jsonResponse } from '@/lib/api-helpers';

export async function GET(req: NextRequest) {
  const { errorResponse: authError } = requireAdmin(req);
  if (authError) return authError;

  const db = await getDb();

  // Fetch pending check-ins
  const pendingCheckIns = db.prepare(`
    SELECT 
      a.id as attendance_id,
      a.employee_id,
      e.full_name as employee_name,
      b.name as branch_name,
      'check_in' as type,
      a.check_in_time as time,
      a.attendance_date,
      a.check_in_photo as photo_filename,
      a.shift_name,
      a.attendance_status
    FROM attendance a
    JOIN employees e ON a.employee_id = e.id
    JOIN branches b ON a.branch_id = b.id
    WHERE a.check_in_verification = 'Pending' 
      AND a.check_in_photo IS NOT NULL 
      AND a.check_in_photo != 'DELETED'
    ORDER BY a.attendance_date DESC, a.check_in_time ASC
  `).all();

  // Fetch pending check-outs
  const pendingCheckOuts = db.prepare(`
    SELECT 
      a.id as attendance_id,
      a.employee_id,
      e.full_name as employee_name,
      b.name as branch_name,
      'check_out' as type,
      a.check_out_time as time,
      a.attendance_date,
      a.check_out_photo as photo_filename,
      a.shift_name,
      a.attendance_status
    FROM attendance a
    JOIN employees e ON a.employee_id = e.id
    JOIN branches b ON a.branch_id = b.id
    WHERE a.check_out_verification = 'Pending' 
      AND a.check_out_photo IS NOT NULL 
      AND a.check_out_photo != 'DELETED'
    ORDER BY a.attendance_date DESC, a.check_out_time ASC
  `).all();

  const allPending = [...pendingCheckIns, ...pendingCheckOuts].map((item: any) => ({
    id: `${item.attendance_id}_${item.type}`,
    attendanceId: item.attendance_id,
    employeeId: item.employee_id,
    employeeName: item.employee_name,
    branchName: item.branch_name,
    type: item.type, // 'check_in' | 'check_out'
    time: item.time,
    date: item.attendance_date,
    shiftName: item.shift_name,
    photoUrl: `/api/admin/photos/${item.photo_filename}`,
    photoFilename: item.photo_filename,
  }));

  return jsonResponse({
    count: allPending.length,
    pending: allPending,
  });
}

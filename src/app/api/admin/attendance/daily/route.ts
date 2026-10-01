import { NextRequest } from 'next/server';
import { getDb } from '@/lib/db';
import { requireAdmin, jsonResponse } from '@/lib/api-helpers';

const DAYS_OF_WEEK = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export async function GET(req: NextRequest) {
  const { errorResponse: authError } = requireAdmin(req);
  if (authError) return authError;

  const url = new URL(req.url);
  const now = new Date();
  const dateParam = url.searchParams.get('date') || new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(now);
  const branchId = url.searchParams.get('branchId');
  const employeeId = url.searchParams.get('employeeId');
  const statusFilter = url.searchParams.get('status');

  const db = await getDb();

  // Determine day of the week for dateParam
  const [year, month, day] = dateParam.split('-').map(Number);
  const dateObj = new Date(year, month - 1, day);
  const dayName = DAYS_OF_WEEK[dateObj.getDay()];

  // Fetch all active employees (filtered by branch/employee if requested)
  let empQuery = `
    SELECT 
      e.id as employee_id,
      e.full_name as employee_name,
      e.weekly_off,
      e.status as employee_status,
      b.id as branch_id,
      b.name as branch_name,
      s.id as shift_id,
      s.name as default_shift_name,
      s.start_time as shift_start,
      s.end_time as shift_end
    FROM employees e
    JOIN branches b ON e.branch_id = b.id
    JOIN shifts s ON e.shift_id = s.id
    WHERE e.status = 'active'
  `;
  const empParams: unknown[] = [];

  if (branchId && branchId !== 'all') {
    empQuery += ` AND e.branch_id = ?`;
    empParams.push(parseInt(branchId, 10));
  }

  if (employeeId && employeeId !== 'all') {
    empQuery += ` AND e.id = ?`;
    empParams.push(parseInt(employeeId, 10));
  }

  empQuery += ` ORDER BY b.name ASC, e.full_name ASC`;
  const activeEmployees = db.prepare(empQuery).all(...empParams) as any[];

  // Fetch attendance records for this date
  const attendanceRecords = db.prepare(`
    SELECT * FROM attendance WHERE attendance_date = ?
  `).all(dateParam) as any[];

  const attendanceMap = new Map<number, any>();
  for (const att of attendanceRecords) {
    attendanceMap.set(att.employee_id, att);
  }

  // Fetch any temporary shift changes for this date
  const tempShifts = db.prepare(`
    SELECT esc.employee_id, s.name as temp_shift_name
    FROM employee_shift_changes esc
    JOIN shifts s ON esc.shift_id = s.id
    WHERE esc.effective_date = ?
  `).all(dateParam) as any[];

  const tempShiftMap = new Map<number, string>();
  for (const ts of tempShifts) {
    tempShiftMap.set(ts.employee_id, ts.temp_shift_name);
  }

  // Combine employees with attendance data
  const combinedList: any[] = [];
  let presentCount = 0;
  let absentCount = 0;
  let weekOffCount = 0;
  let leaveCount = 0;
  let halfDayCount = 0;
  let pendingVerificationCount = 0;

  for (const emp of activeEmployees) {
    const att = attendanceMap.get(emp.employee_id);
    const activeShift = tempShiftMap.get(emp.employee_id) || (att ? att.shift_name : null) || emp.default_shift_name;
    const isNormalWeekOff = emp.weekly_off.toLowerCase() === dayName.toLowerCase();

    let computedStatus = 'Not Marked';
    let checkInTime = null;
    let checkOutTime = null;
    let checkInVerification = null;
    let checkOutVerification = null;
    let checkInPhoto = null;
    let checkOutPhoto = null;
    let attendanceId = null;
    let manualOverride = 0;
    let updatedByAdmin = 0;
    let updatedAt = null;

    if (att) {
      attendanceId = att.id;
      checkInTime = att.check_in_time;
      checkOutTime = att.check_out_time;
      checkInVerification = att.check_in_verification;
      checkOutVerification = att.check_out_verification;
      checkInPhoto = att.check_in_photo;
      checkOutPhoto = att.check_out_photo;
      computedStatus = att.attendance_status || 'Pending';
      manualOverride = att.manual_override;
      updatedByAdmin = att.updated_by_admin;
      updatedAt = att.updated_at;

      if (
        (att.check_in_verification === 'Pending' && att.check_in_photo && att.check_in_photo !== 'DELETED') ||
        (att.check_out_verification === 'Pending' && att.check_out_photo && att.check_out_photo !== 'DELETED')
      ) {
        pendingVerificationCount++;
      }
    } else {
      // No attendance record created yet
      if (isNormalWeekOff) {
        computedStatus = 'Week Off';
      }
    }

    // Tally counts
    if (computedStatus === 'Present') presentCount++;
    else if (computedStatus === 'Absent') absentCount++;
    else if (computedStatus === 'Week Off') weekOffCount++;
    else if (computedStatus === 'Leave') leaveCount++;
    else if (computedStatus === 'Half Day') halfDayCount++;

    const item = {
      attendanceId,
      employeeId: emp.employee_id,
      employeeName: emp.employee_name,
      branchId: emp.branch_id,
      branchName: emp.branch_name,
      shiftName: activeShift,
      weeklyOff: emp.weekly_off,
      isDayOfWeekOff: isNormalWeekOff,
      checkInTime,
      checkOutTime,
      checkInVerification,
      checkOutVerification,
      checkInPhoto,
      checkOutPhoto,
      status: computedStatus,
      manualOverride: !!manualOverride,
      updatedByAdmin: !!updatedByAdmin,
      updatedAt,
      date: dateParam,
    };

    // Apply status filter if provided
    if (!statusFilter || statusFilter === 'all' || computedStatus.toLowerCase() === statusFilter.toLowerCase()) {
      combinedList.push(item);
    }
  }

  // Also query global pending verifications across any dates to show on dashboard badge
  const totalPendingGlobal = db.prepare(`
    SELECT 
      (SELECT COUNT(*) FROM attendance WHERE check_in_verification = 'Pending' AND check_in_photo IS NOT NULL AND check_in_photo != 'DELETED') +
      (SELECT COUNT(*) FROM attendance WHERE check_out_verification = 'Pending' AND check_out_photo IS NOT NULL AND check_out_photo != 'DELETED') as count
  `).get() as { count: number };

  return jsonResponse({
    date: dateParam,
    dayName,
    summary: {
      totalEmployees: activeEmployees.length,
      present: presentCount,
      absent: absentCount,
      weekOff: weekOffCount,
      leave: leaveCount,
      halfDay: halfDayCount,
      pendingVerificationToday: pendingVerificationCount,
      totalPendingGlobal: totalPendingGlobal.count,
    },
    attendance: combinedList,
  });
}

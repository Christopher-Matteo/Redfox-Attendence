import { NextRequest } from 'next/server';
import { getDb } from '@/lib/db';
import { requireAdmin, errorResponse, jsonResponse } from '@/lib/api-helpers';

const DAYS_OF_WEEK = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export async function GET(req: NextRequest) {
  const { errorResponse: authError } = requireAdmin(req);
  if (authError) return authError;

  const url = new URL(req.url);
  const now = new Date();
  const currentMonthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const monthParam = url.searchParams.get('month') || currentMonthStr; // "YYYY-MM"
  const branchId = url.searchParams.get('branchId');
  const employeeId = url.searchParams.get('employeeId');

  const [yearStr, mStr] = monthParam.split('-');
  const year = parseInt(yearStr, 10);
  const month = parseInt(mStr, 10);

  if (isNaN(year) || isNaN(month) || month < 1 || month > 12) {
    return errorResponse('Invalid month format. Expected YYYY-MM', 400);
  }

  const daysInMonth = new Date(year, month, 0).getDate();
  const db = getDb();

  // Get active employees
  let empQuery = `
    SELECT 
      e.id as employee_id,
      e.full_name as employee_name,
      e.weekly_off,
      b.id as branch_id,
      b.name as branch_name,
      s.name as default_shift_name
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

  const employees = db.prepare(empQuery).all(...empParams) as any[];

  // Fetch all attendance for this month
  const startDate = `${monthParam}-01`;
  const endDate = `${monthParam}-${String(daysInMonth).padStart(2, '0')}`;

  const attendanceRecords = db.prepare(`
    SELECT * FROM attendance
    WHERE attendance_date >= ? AND attendance_date <= ?
    ORDER BY attendance_date ASC
  `).all(startDate, endDate) as any[];

  // Map by employee_id + attendance_date
  const attMap = new Map<string, any>();
  for (const r of attendanceRecords) {
    attMap.set(`${r.employee_id}_${r.attendance_date}`, r);
  }

  // Fetch temporary shift changes for this month
  const tempShifts = db.prepare(`
    SELECT esc.employee_id, esc.effective_date, s.name as temp_shift_name
    FROM employee_shift_changes esc
    JOIN shifts s ON esc.shift_id = s.id
    WHERE esc.effective_date >= ? AND esc.effective_date <= ?
  `).all(startDate, endDate) as any[];

  const tempShiftMap = new Map<string, string>();
  for (const ts of tempShifts) {
    tempShiftMap.set(`${ts.employee_id}_${ts.effective_date}`, ts.temp_shift_name);
  }

  // Today string to not mark future days as absent
  const todayStr = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(now);

  const reportData = employees.map((emp) => {
    let presentCount = 0;
    let absentCount = 0;
    let weekOffCount = 0;
    let leaveCount = 0;
    let halfDayCount = 0;

    const dailyLogs = [];

    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${monthParam}-${String(d).padStart(2, '0')}`;
      const dayDate = new Date(year, month - 1, d);
      const dayName = DAYS_OF_WEEK[dayDate.getDay()];
      const isPastOrToday = dateStr <= todayStr;
      const isWeekOffDay = emp.weekly_off.toLowerCase() === dayName.toLowerCase();

      const rec = attMap.get(`${emp.employee_id}_${dateStr}`);
      const shiftName = tempShiftMap.get(`${emp.employee_id}_${dateStr}`) || (rec ? rec.shift_name : null) || emp.default_shift_name;

      let status = '-';
      let checkIn = null;
      let checkOut = null;
      let verification = null;

      if (rec) {
        status = rec.attendance_status || (rec.check_in_time ? 'Present' : 'Pending');
        checkIn = rec.check_in_time;
        checkOut = rec.check_out_time;
        verification = rec.check_in_verification;
      } else if (isWeekOffDay) {
        status = 'Week Off';
      } else if (isPastOrToday) {
        status = 'Not Marked';
      } else {
        status = 'Upcoming';
      }

      if (status === 'Present') presentCount++;
      else if (status === 'Absent') absentCount++;
      else if (status === 'Week Off') weekOffCount++;
      else if (status === 'Leave') leaveCount++;
      else if (status === 'Half Day') halfDayCount++;

      dailyLogs.push({
        date: dateStr,
        dayNumber: d,
        dayName,
        status,
        checkIn,
        checkOut,
        shiftName,
        verification,
      });
    }

    const workingDays = presentCount + (halfDayCount * 0.5);

    return {
      employeeId: emp.employee_id,
      employeeName: emp.employee_name,
      branchId: emp.branch_id,
      branchName: emp.branch_name,
      weeklyOff: emp.weekly_off,
      summary: {
        present: presentCount,
        absent: absentCount,
        weekOff: weekOffCount,
        leave: leaveCount,
        halfDay: halfDayCount,
        workingDays,
        totalDays: daysInMonth,
      },
      dailyLogs,
    };
  });

  return jsonResponse({
    month: monthParam,
    daysInMonth,
    reports: reportData,
  });
}

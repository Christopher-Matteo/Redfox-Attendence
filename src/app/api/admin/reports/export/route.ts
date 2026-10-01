import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { requireAdmin, errorResponse } from '@/lib/api-helpers';

function escapeCsvField(val: unknown): string {
  if (val === null || val === undefined) return '""';
  const str = String(val).replace(/"/g, '""');
  return `"${str}"`;
}

export async function GET(req: NextRequest) {
  const { errorResponse: authError } = requireAdmin(req);
  if (authError) return authError;

  const url = new URL(req.url);
  const type = url.searchParams.get('type') || 'daily'; // 'daily' | 'monthly'
  const dateParam = url.searchParams.get('date');
  const monthParam = url.searchParams.get('month');
  const branchId = url.searchParams.get('branchId');
  const employeeId = url.searchParams.get('employeeId');

  const db = await getDb();

  const DAYS_OF_WEEK = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const today = dateParam || new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(new Date());

  let query = '';
  const params: unknown[] = [];

  if (type === 'daily') {
    const [year, month, day] = today.split('-').map(Number);
    const dayDate = new Date(year, month - 1, day);
    const dayName = DAYS_OF_WEEK[dayDate.getDay()];

    query = `
      SELECT 
        e.full_name as employee_name,
        COALESCE(b.name, 'Unassigned Branch') as branch_name,
        ? as attendance_date,
        COALESCE(esc.shift_name, CASE WHEN a.check_in_time IS NOT NULL THEN a.shift_name ELSE NULL END, s.name, 'General Shift') as shift_name,
        COALESCE(a.check_in_time, '-') as check_in_time,
        COALESCE(a.check_out_time, '-') as check_out_time,
        COALESCE(a.attendance_status, CASE WHEN LOWER(e.weekly_off) = LOWER(?) THEN 'Week Off' ELSE 'Not Marked' END) as attendance_status,
        COALESCE(a.check_in_verification, '-') as verification_status
      FROM employees e
      LEFT JOIN branches b ON e.branch_id = b.id
      LEFT JOIN shifts s ON e.shift_id = s.id
      LEFT JOIN attendance a ON a.employee_id = e.id AND a.attendance_date = ?
      LEFT JOIN (
        SELECT esc_sub.employee_id, s_sub.name as shift_name
        FROM employee_shift_changes esc_sub
        JOIN shifts s_sub ON esc_sub.shift_id = s_sub.id
        WHERE esc_sub.effective_date = ?
      ) esc ON esc.employee_id = e.id
      WHERE (e.status = 'active' OR a.id IS NOT NULL)
    `;
    params.push(today, dayName, today, today);

    if (branchId && branchId !== 'all') {
      query += ` AND e.branch_id = ?`;
      params.push(parseInt(branchId, 10));
    }

    if (employeeId && employeeId !== 'all') {
      query += ` AND e.id = ?`;
      params.push(parseInt(employeeId, 10));
    }

    query += ` ORDER BY b.name ASC, e.full_name ASC`;
  } else {
    // monthly export
    const month = monthParam || new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(new Date()).slice(0, 7);

    query = `
      SELECT 
        e.full_name as employee_name,
        COALESCE(b.name, 'Unassigned Branch') as branch_name,
        a.attendance_date,
        COALESCE(a.shift_name, s.name, 'General Shift') as shift_name,
        COALESCE(a.check_in_time, '-') as check_in_time,
        COALESCE(a.check_out_time, '-') as check_out_time,
        COALESCE(a.attendance_status, 'Pending') as attendance_status,
        COALESCE(a.check_in_verification, '-') as verification_status
      FROM attendance a
      JOIN employees e ON a.employee_id = e.id
      LEFT JOIN branches b ON a.branch_id = b.id
      LEFT JOIN shifts s ON e.shift_id = s.id
      WHERE a.attendance_date LIKE ?
    `;
    params.push(`${month}%`);

    if (branchId && branchId !== 'all') {
      query += ` AND e.branch_id = ?`;
      params.push(parseInt(branchId, 10));
    }

    if (employeeId && employeeId !== 'all') {
      query += ` AND e.id = ?`;
      params.push(parseInt(employeeId, 10));
    }

    query += ` ORDER BY a.attendance_date DESC, b.name ASC, e.full_name ASC`;
  }

  const rows = db.prepare(query).all(...params) as any[];

  // Build CSV content
  const headers = [
    'Employee Name',
    'Branch',
    'Date',
    'Shift',
    'Check In',
    'Check Out',
    'Attendance Status',
    'Verification Status',
  ];

  const csvRows = [headers.join(',')];

  for (const row of rows) {
    csvRows.push([
      escapeCsvField(row.employee_name),
      escapeCsvField(row.branch_name),
      escapeCsvField(row.attendance_date),
      escapeCsvField(row.shift_name),
      escapeCsvField(row.check_in_time),
      escapeCsvField(row.check_out_time),
      escapeCsvField(row.attendance_status),
      escapeCsvField(row.verification_status),
    ].join(','));
  }

  const csvString = csvRows.join('\r\n');
  const filename = `redfox_attendance_${type}_${Date.now()}.csv`;

  return new NextResponse(csvString, {
    status: 200,
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Cache-Control': 'no-cache, no-store, must-revalidate',
    },
  });
}

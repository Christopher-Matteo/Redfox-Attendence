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

  const db = getDb();

  let query = `
    SELECT 
      e.full_name as employee_name,
      b.name as branch_name,
      a.attendance_date,
      COALESCE(a.shift_name, s.name) as shift_name,
      COALESCE(a.check_in_time, '-') as check_in_time,
      COALESCE(a.check_out_time, '-') as check_out_time,
      COALESCE(a.attendance_status, 'Pending') as attendance_status,
      COALESCE(a.check_in_verification, 'Pending') as verification_status
    FROM employees e
    JOIN branches b ON e.branch_id = b.id
    JOIN shifts s ON e.shift_id = s.id
    LEFT JOIN attendance a ON a.employee_id = e.id
    WHERE 1=1
  `;
  const params: unknown[] = [];

  if (type === 'daily') {
    const today = dateParam || new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(new Date());
    query += ` AND a.attendance_date = ?`;
    params.push(today);
  } else if (type === 'monthly') {
    const month = monthParam || new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(new Date()).slice(0, 7);
    query += ` AND a.attendance_date LIKE ?`;
    params.push(`${month}%`);
  }

  if (branchId && branchId !== 'all') {
    query += ` AND e.branch_id = ?`;
    params.push(parseInt(branchId, 10));
  }

  if (employeeId && employeeId !== 'all') {
    query += ` AND e.id = ?`;
    params.push(parseInt(employeeId, 10));
  }

  query += ` ORDER BY a.attendance_date DESC, b.name ASC, e.full_name ASC`;

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

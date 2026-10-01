import { NextRequest } from 'next/server';
import { getDb } from '@/lib/db';
import { errorResponse, jsonResponse } from '@/lib/api-helpers';

export async function GET(req: NextRequest, { params }: { params: Promise<{ code: string }> }) {
  const resolvedParams = await params;
  const branchCode = resolvedParams.code?.toLowerCase().trim();

  if (!branchCode) {
    return errorResponse('Branch code is required', 400);
  }

  const db = await getDb();
  const branch = db.prepare('SELECT id, name, code, status FROM branches WHERE code = ?').get(branchCode) as {
    id: number;
    name: string;
    code: string;
    status: string;
  } | undefined;

  if (!branch) {
    return errorResponse(`Branch "${branchCode}" not found. Please verify the QR code.`, 404);
  }

  if (branch.status !== 'active') {
    return errorResponse(`This branch (${branch.name}) is currently marked inactive by management.`, 403);
  }

  // Fetch only ACTIVE employees assigned to this branch
  const employees = db.prepare(`
    SELECT 
      e.id, 
      e.full_name,
      e.weekly_off,
      s.name as default_shift_name,
      s.start_time as default_shift_start,
      s.end_time as default_shift_end
    FROM employees e
    JOIN shifts s ON e.shift_id = s.id
    WHERE e.branch_id = ? AND e.status = 'active'
    ORDER BY e.full_name ASC
  `).all(branch.id) as any[];

  // Also check today's temporary shift overrides for each employee
  const now = new Date();
  const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(now);
  const tempShifts = db.prepare(`
    SELECT esc.employee_id, s.name as shift_name, s.start_time as shift_start, s.end_time as shift_end
    FROM employee_shift_changes esc
    JOIN shifts s ON esc.shift_id = s.id
    WHERE esc.effective_date = ?
  `).all(today) as any[];

  const tempShiftMap = new Map<number, any>();
  for (const ts of tempShifts) {
    tempShiftMap.set(ts.employee_id, ts);
  }

  const hydratedEmployees = employees.map((emp) => {
    const ts = tempShiftMap.get(emp.id);
    return {
      id: emp.id,
      full_name: emp.full_name,
      weekly_off: emp.weekly_off,
      shift_name: ts ? ts.shift_name : emp.default_shift_name,
      shift_start: ts ? ts.shift_start : emp.default_shift_start,
      shift_end: ts ? ts.shift_end : emp.default_shift_end,
    };
  });

  return jsonResponse({
    branch: {
      id: branch.id,
      name: branch.name,
      code: branch.code,
    },
    employees: hydratedEmployees,
  });
}

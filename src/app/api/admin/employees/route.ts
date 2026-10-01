import { NextRequest } from 'next/server';
import { getDb } from '@/lib/db';
import { requireAdmin, errorResponse, jsonResponse } from '@/lib/api-helpers';

export async function GET(req: NextRequest) {
  const { errorResponse: authError } = requireAdmin(req);
  if (authError) return authError;

  const url = new URL(req.url);
  const branchId = url.searchParams.get('branchId');
  const status = url.searchParams.get('status');

  const db = await getDb();
  let query = `
    SELECT 
      e.id,
      e.full_name,
      e.branch_id,
      e.shift_id,
      e.weekly_off,
      e.status,
      e.created_at,
      e.updated_at,
      COALESCE(b.name, 'Unassigned Branch') as branch_name,
      COALESCE(b.code, '') as branch_code,
      COALESCE(s.name, 'Unassigned Shift') as shift_name,
      COALESCE(s.start_time, '09:00') as shift_start,
      COALESCE(s.end_time, '19:00') as shift_end
    FROM employees e
    LEFT JOIN branches b ON e.branch_id = b.id
    LEFT JOIN shifts s ON e.shift_id = s.id
    WHERE 1=1
  `;
  const params: unknown[] = [];

  if (branchId && branchId !== 'all') {
    query += ` AND e.branch_id = ?`;
    params.push(parseInt(branchId, 10));
  }

  if (status && status !== 'all') {
    query += ` AND e.status = ?`;
    params.push(status);
  }

  query += ` ORDER BY e.status ASC, e.full_name ASC`;

  const employees = db.prepare(query).all(...params);
  return jsonResponse({ employees });
}

export async function POST(req: NextRequest) {
  const { errorResponse: authError } = requireAdmin(req);
  if (authError) return authError;

  try {
    const body = await req.json();
    const fullName = typeof body.full_name === 'string' ? body.full_name.trim() : '';
    const branchId = parseInt(body.branch_id, 10);
    const shiftId = parseInt(body.shift_id, 10);
    const weeklyOff = body.weekly_off;
    const status = body.status === 'inactive' ? 'inactive' : 'active';

    if (!fullName) {
      return errorResponse('Full name is required', 400);
    }
    if (isNaN(branchId) || branchId <= 0) {
      return errorResponse('A valid branch must be selected', 400);
    }
    if (isNaN(shiftId) || shiftId <= 0) {
      return errorResponse('A valid shift must be selected', 400);
    }

    const db = await getDb();

    // Verify branch exists
    const branch = db.prepare('SELECT id, name FROM branches WHERE id = ?').get(branchId) as { id: number; name: string } | undefined;
    if (!branch) {
      return errorResponse('The selected branch does not exist', 400);
    }

    // Verify shift exists
    const shift = db.prepare('SELECT id, name FROM shifts WHERE id = ?').get(shiftId) as { id: number; name: string } | undefined;
    if (!shift) {
      return errorResponse('The selected shift does not exist', 400);
    }

    const validWeeklyOff = [
      'Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'
    ].includes(weeklyOff) ? weeklyOff : 'Sunday';

    const now = new Date().toISOString();

    const result = db.prepare(`
      INSERT INTO employees (full_name, branch_id, shift_id, weekly_off, status, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(fullName, branchId, shiftId, validWeeklyOff, status, now, now);

    const newEmp = db.prepare(`
      SELECT 
        e.id,
        e.full_name,
        e.branch_id,
        e.shift_id,
        e.weekly_off,
        e.status,
        e.created_at,
        e.updated_at,
        COALESCE(b.name, 'Unassigned Branch') as branch_name,
        COALESCE(b.code, '') as branch_code,
        COALESCE(s.name, 'Unassigned Shift') as shift_name,
        COALESCE(s.start_time, '09:00') as shift_start,
        COALESCE(s.end_time, '19:00') as shift_end
      FROM employees e
      LEFT JOIN branches b ON e.branch_id = b.id
      LEFT JOIN shifts s ON e.shift_id = s.id
      WHERE e.id = ?
    `).get(result.lastInsertRowid);

    return jsonResponse({ success: true, employee: newEmp, message: 'Employee added successfully' }, 201);
  } catch (error) {
    console.error('Error creating employee:', error);
    return errorResponse('Internal server error', 500);
  }
}

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
      e.*,
      b.name as branch_name,
      b.code as branch_code,
      s.name as shift_name,
      s.start_time as shift_start,
      s.end_time as shift_end
    FROM employees e
    JOIN branches b ON e.branch_id = b.id
    JOIN shifts s ON e.shift_id = s.id
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
    const { full_name, branch_id, shift_id, weekly_off, status } = await req.json();

    if (!full_name || !branch_id || !shift_id) {
      return errorResponse('Full name, branch, and shift are required', 400);
    }

    const validWeeklyOff = [
      'Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'
    ].includes(weekly_off) ? weekly_off : 'Sunday';

    const validStatus = status === 'inactive' ? 'inactive' : 'active';
    const now = new Date().toISOString();

    const db = await getDb();
    const result = db.prepare(`
      INSERT INTO employees (full_name, branch_id, shift_id, weekly_off, status, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(full_name.trim(), branch_id, shift_id, validWeeklyOff, validStatus, now, now);

    const newEmp = db.prepare(`
      SELECT e.*, b.name as branch_name, s.name as shift_name
      FROM employees e
      JOIN branches b ON e.branch_id = b.id
      JOIN shifts s ON e.shift_id = s.id
      WHERE e.id = ?
    `).get(result.lastInsertRowid);

    return jsonResponse({ success: true, employee: newEmp }, 201);
  } catch (error) {
    console.error('Error creating employee:', error);
    return errorResponse('Internal server error', 500);
  }
}

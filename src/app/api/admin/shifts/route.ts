import { NextRequest } from 'next/server';
import { getDb } from '@/lib/db';
import { requireAdmin, errorResponse, jsonResponse } from '@/lib/api-helpers';

export async function GET(req: NextRequest) {
  const { errorResponse: authError } = requireAdmin(req);
  if (authError) return authError;

  const db = await getDb();
  const shifts = db.prepare(`
    SELECT 
      s.*,
      (SELECT COUNT(*) FROM employees e WHERE e.shift_id = s.id) as assigned_employees_count
    FROM shifts s
    ORDER BY s.start_time ASC
  `).all();

  return jsonResponse({ shifts });
}

export async function POST(req: NextRequest) {
  const { errorResponse: authError } = requireAdmin(req);
  if (authError) return authError;

  try {
    const { name, start_time, end_time } = await req.json();

    if (!name || !start_time || !end_time) {
      return errorResponse('Shift name, start time, and end time are required', 400);
    }

    const now = new Date().toISOString();
    const db = await getDb();

    const result = db.prepare(`
      INSERT INTO shifts (name, start_time, end_time, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?)
    `).run(name.trim(), start_time.trim(), end_time.trim(), now, now);

    const newShift = db.prepare('SELECT * FROM shifts WHERE id = ?').get(result.lastInsertRowid);
    return jsonResponse({ success: true, shift: newShift }, 201);
  } catch (error) {
    console.error('Error creating shift:', error);
    return errorResponse('Internal server error', 500);
  }
}

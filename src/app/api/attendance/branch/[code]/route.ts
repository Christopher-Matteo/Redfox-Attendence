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
      s.name as shift_name,
      s.start_time as shift_start,
      s.end_time as shift_end
    FROM employees e
    JOIN shifts s ON e.shift_id = s.id
    WHERE e.branch_id = ? AND e.status = 'active'
    ORDER BY e.full_name ASC
  `).all(branch.id);

  return jsonResponse({
    branch: {
      id: branch.id,
      name: branch.name,
      code: branch.code,
    },
    employees,
  });
}

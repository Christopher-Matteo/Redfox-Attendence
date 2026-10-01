import { NextRequest } from 'next/server';
import crypto from 'crypto';
import { getDb } from '@/lib/db';
import { requireAdmin, errorResponse, jsonResponse } from '@/lib/api-helpers';

export async function GET(req: NextRequest) {
  const { errorResponse: authError } = requireAdmin(req);
  if (authError) return authError;

  const db = await getDb();
  const branches = db.prepare(`
    SELECT b.*, 
      (SELECT COUNT(*) FROM employees e WHERE e.branch_id = b.id AND e.status = 'active') as active_employees_count,
      (SELECT COUNT(*) FROM employees e WHERE e.branch_id = b.id) as total_employees_count
    FROM branches b
    ORDER BY b.name ASC
  `).all();

  return jsonResponse({ branches });
}

export async function POST(req: NextRequest) {
  const { errorResponse: authError } = requireAdmin(req);
  if (authError) return authError;

  try {
    const { name, code } = await req.json();

    if (!name || !code) {
      return errorResponse('Branch name and branch code are required', 400);
    }

    const cleanCode = code.trim().toLowerCase().replace(/[^a-z0-9-_]/g, '-');
    if (!cleanCode) {
      return errorResponse('Invalid branch code format', 400);
    }

    const db = await getDb();

    // Check duplicate code
    const existing = db.prepare('SELECT id FROM branches WHERE code = ?').get(cleanCode);
    if (existing) {
      return errorResponse(`Branch code "${cleanCode}" is already in use`, 409);
    }

    const now = new Date().toISOString();
    const qrToken = crypto.randomUUID();

    const result = db.prepare(`
      INSERT INTO branches (name, code, status, qr_token, created_at, updated_at)
      VALUES (?, ?, 'active', ?, ?, ?)
    `).run(name.trim(), cleanCode, qrToken, now, now);

    const newBranch = db.prepare('SELECT * FROM branches WHERE id = ?').get(result.lastInsertRowid);

    return jsonResponse({ success: true, branch: newBranch }, 201);
  } catch (error) {
    console.error('Error creating branch:', error);
    return errorResponse('Internal server error', 500);
  }
}

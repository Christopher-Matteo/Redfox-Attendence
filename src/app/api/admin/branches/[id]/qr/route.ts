import { NextRequest } from 'next/server';
import { getDb } from '@/lib/db';
import { generateQrDataUrl } from '@/lib/qr';
import { requireAdmin, errorResponse, jsonResponse } from '@/lib/api-helpers';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { errorResponse: authError } = requireAdmin(req);
  if (authError) return authError;

  const resolvedParams = await params;
  const branchId = parseInt(resolvedParams.id, 10);
  if (isNaN(branchId)) return errorResponse('Invalid branch ID', 400);

  const db = getDb();
  const branch = db.prepare('SELECT * FROM branches WHERE id = ?').get(branchId) as {
    id: number;
    name: string;
    code: string;
    status: string;
    qr_token: string;
  } | undefined;

  if (!branch) return errorResponse('Branch not found', 404);

  // Build the relative and absolute attendance URL
  const origin = req.nextUrl.origin;
  const attendanceRelativeUrl = `/attendance/${branch.code}`;
  const attendanceFullUrl = `${origin}${attendanceRelativeUrl}`;

  const qrDataUrl = await generateQrDataUrl(attendanceFullUrl);

  return jsonResponse({
    branch: {
      id: branch.id,
      name: branch.name,
      code: branch.code,
      status: branch.status,
      attendanceUrl: attendanceRelativeUrl,
      attendanceFullUrl: attendanceFullUrl,
      qrDataUrl: qrDataUrl,
    },
  });
}

import { NextRequest, NextResponse } from 'next/server';
import path from 'path';
import fs from 'fs';
import { requireAdmin, errorResponse } from '@/lib/api-helpers';
import { PHOTOS_DIR } from '@/lib/db';

export async function GET(req: NextRequest, { params }: { params: Promise<{ filename: string }> }) {
  const { errorResponse: authError } = requireAdmin(req);
  if (authError) return authError;

  const resolvedParams = await params;
  const filename = resolvedParams.filename;
  if (!filename || filename === 'DELETED') {
    return errorResponse('Photo has been deleted after verification', 404);
  }

  // Prevent path traversal
  const safeFilename = path.basename(filename);
  const filePath = path.join(PHOTOS_DIR, safeFilename);

  if (!fs.existsSync(filePath)) {
    return errorResponse('Photo file not found or already deleted', 404);
  }

  try {
    const fileBuffer = fs.readFileSync(filePath);
    const ext = path.extname(safeFilename).toLowerCase();
    const contentType = ext === '.png' ? 'image/png' : ext === '.webp' ? 'image/webp' : 'image/jpeg';

    return new NextResponse(fileBuffer, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'private, no-cache, no-store, must-revalidate',
      },
    });
  } catch (error) {
    console.error('Error serving photo:', error);
    return errorResponse('Failed to load photo', 500);
  }
}

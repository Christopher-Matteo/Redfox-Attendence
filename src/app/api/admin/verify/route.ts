import { NextRequest } from 'next/server';
import { getDb } from '@/lib/db';
import { deletePhotoFile } from '@/lib/photos';
import { requireAdmin, errorResponse, jsonResponse } from '@/lib/api-helpers';

export async function POST(req: NextRequest) {
  const { errorResponse: authError } = requireAdmin(req);
  if (authError) return authError;

  try {
    const { attendanceId, type, decision } = await req.json();

    if (!attendanceId || !type || !decision) {
      return errorResponse('attendanceId, type ("check_in" | "check_out"), and decision ("correct" | "wrong") are required', 400);
    }

    if (!['check_in', 'check_out'].includes(type) || !['correct', 'wrong'].includes(decision)) {
      return errorResponse('Invalid parameters provided', 400);
    }

    const db = await getDb();
    const attendance = db.prepare('SELECT * FROM attendance WHERE id = ?').get(attendanceId) as {
      id: number;
      employee_id: number;
      branch_id: number;
      check_in_photo: string | null;
      check_out_photo: string | null;
      attendance_status: string | null;
      manual_override: number;
    } | undefined;

    if (!attendance) {
      return errorResponse('Attendance record not found', 404);
    }

    const now = new Date().toISOString();

    if (type === 'check_in') {
      const isCorrect = decision === 'correct';
      const newVerification = isCorrect ? 'Verified' : 'Rejected';
      const newStatus = isCorrect ? 'Present' : 'Absent';

      // Delete the temporary check-in photo file
      if (attendance.check_in_photo) {
        deletePhotoFile(attendance.check_in_photo);
      }

      db.prepare(`
        UPDATE attendance SET
          check_in_verification = ?,
          check_in_photo = 'DELETED',
          attendance_status = CASE WHEN manual_override = 1 THEN attendance_status ELSE ? END,
          updated_by_admin = 1,
          updated_at = ?
        WHERE id = ?
      `).run(newVerification, newStatus, now, attendanceId);
    } else {
      // type === 'check_out'
      const isCorrect = decision === 'correct';
      const newVerification = isCorrect ? 'Verified' : 'Rejected';

      // Delete the temporary check-out photo file
      if (attendance.check_out_photo) {
        deletePhotoFile(attendance.check_out_photo);
      }

      // If wrong person on check-out, can also flag attendance as absent if needed
      db.prepare(`
        UPDATE attendance SET
          check_out_verification = ?,
          check_out_photo = 'DELETED',
          attendance_status = CASE 
            WHEN ? = 'wrong' AND manual_override = 0 THEN 'Absent' 
            ELSE attendance_status 
          END,
          updated_by_admin = 1,
          updated_at = ?
        WHERE id = ?
      `).run(newVerification, decision, now, attendanceId);
    }

    // Count remaining pending verifications
    const pendingCountResult = db.prepare(`
      SELECT 
        (SELECT COUNT(*) FROM attendance WHERE check_in_verification = 'Pending' AND check_in_photo IS NOT NULL AND check_in_photo != 'DELETED') +
        (SELECT COUNT(*) FROM attendance WHERE check_out_verification = 'Pending' AND check_out_photo IS NOT NULL AND check_out_photo != 'DELETED') as count
    `).get() as { count: number };

    return jsonResponse({
      success: true,
      decision,
      type,
      attendanceId,
      remainingPendingCount: pendingCountResult.count,
    });
  } catch (error) {
    console.error('Error verifying attendance:', error);
    return errorResponse('Internal server error', 500);
  }
}

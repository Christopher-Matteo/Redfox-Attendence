import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { getPhotosDir } from './db';

/**
 * Saves a base64 encoded image to the private photos directory.
 * Returns the generated non-guessable filename.
 */
export function saveTemporaryPhoto(base64Data: string, prefix: 'cin' | 'cout' = 'cin'): string {
  const photosDir = getPhotosDir();

  // Strip data URL header if present (e.g. "data:image/jpeg;base64,")
  const matches = base64Data.match(/^data:image\/([a-zA-Z0-9]+);base64,(.+)$/);
  let ext = 'jpg';
  let buffer: Buffer;

  if (matches && matches[2]) {
    ext = matches[1] === 'png' ? 'png' : matches[1] === 'webp' ? 'webp' : 'jpg';
    buffer = Buffer.from(matches[2], 'base64');
  } else {
    // Raw base64 string
    buffer = Buffer.from(base64Data, 'base64');
  }

  const randomId = crypto.randomBytes(16).toString('hex');
  const filename = `${prefix}_${randomId}.${ext}`;
  const filePath = path.join(photosDir, filename);

  fs.writeFileSync(filePath, buffer);
  return filename;
}

/**
 * Permanently deletes the temporary photo from disk.
 */
export function deletePhotoFile(filename: string | null | undefined): boolean {
  if (!filename || filename === 'DELETED') return false;
  try {
    const photosDir = getPhotosDir();
    const safeFilename = path.basename(filename); // Prevent path traversal
    const filePath = path.join(photosDir, safeFilename);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      return true;
    }
  } catch (err) {
    console.error('Error deleting photo file:', err);
  }
  return false;
}

/**
 * Checks if photo file exists on disk.
 */
export function photoExists(filename: string | null | undefined): boolean {
  if (!filename || filename === 'DELETED') return false;
  try {
    const photosDir = getPhotosDir();
    const safeFilename = path.basename(filename);
    const filePath = path.join(photosDir, safeFilename);
    return fs.existsSync(filePath);
  } catch {
    return false;
  }
}

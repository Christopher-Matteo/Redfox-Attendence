import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';

const DATA_DIR = path.join(process.cwd(), 'data');
const DB_PATH = path.join(DATA_DIR, 'attendance.db');
export const PHOTOS_DIR = path.join(DATA_DIR, 'photos');

// Ensure data and photo directories exist
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}
if (!fs.existsSync(PHOTOS_DIR)) {
  fs.mkdirSync(PHOTOS_DIR, { recursive: true });
}

let dbInstance: Database.Database | null = null;

export function getDb(): Database.Database {
  if (!dbInstance) {
    dbInstance = new Database(DB_PATH);
    dbInstance.pragma('journal_mode = WAL');
    dbInstance.pragma('foreign_keys = ON');
    initTables(dbInstance);
  }
  return dbInstance;
}

// Password hashing utilities using built-in scrypt
export function hashPassword(password: string): { hash: string; salt: string } {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  return { hash, salt };
}

export function verifyPassword(password: string, hash: string, salt: string): boolean {
  try {
    const computedHash = crypto.scryptSync(password, salt, 64).toString('hex');
    return crypto.timingSafeEqual(Buffer.from(hash, 'hex'), Buffer.from(computedHash, 'hex'));
  } catch {
    return false;
  }
}

function initTables(db: Database.Database) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS admins (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      password_salt TEXT NOT NULL,
      full_name TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS branches (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      code TEXT UNIQUE NOT NULL,
      status TEXT NOT NULL DEFAULT 'active',
      qr_token TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS shifts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      start_time TEXT NOT NULL,
      end_time TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS employees (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      full_name TEXT NOT NULL,
      branch_id INTEGER NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
      shift_id INTEGER NOT NULL REFERENCES shifts(id),
      weekly_off TEXT NOT NULL DEFAULT 'Sunday',
      status TEXT NOT NULL DEFAULT 'active',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS employee_shift_changes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      employee_id INTEGER NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
      shift_id INTEGER NOT NULL REFERENCES shifts(id) ON DELETE CASCADE,
      effective_date TEXT NOT NULL,
      created_at TEXT NOT NULL,
      UNIQUE(employee_id, effective_date)
    );

    CREATE TABLE IF NOT EXISTS attendance (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      employee_id INTEGER NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
      branch_id INTEGER NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
      attendance_date TEXT NOT NULL,
      shift_name TEXT,
      check_in_time TEXT,
      check_in_photo TEXT,
      check_in_verification TEXT DEFAULT 'Pending',
      check_out_time TEXT,
      check_out_photo TEXT,
      check_out_verification TEXT DEFAULT 'Pending',
      attendance_status TEXT,
      manual_override INTEGER DEFAULT 0,
      updated_by_admin INTEGER DEFAULT 0,
      admin_notes TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      UNIQUE(employee_id, attendance_date)
    );

    CREATE INDEX IF NOT EXISTS idx_attendance_date ON attendance(attendance_date);
    CREATE INDEX IF NOT EXISTS idx_attendance_branch ON attendance(branch_id);
    CREATE INDEX IF NOT EXISTS idx_attendance_employee ON attendance(employee_id);
  `);

  // Seed default admin if none exists
  const adminCount = db.prepare('SELECT COUNT(*) as count FROM admins').get() as { count: number };
  if (adminCount.count === 0) {
    const { hash, salt } = hashPassword('RedfoxAdmin2026!');
    db.prepare(`
      INSERT INTO admins (username, password_hash, password_salt, full_name, created_at)
      VALUES (?, ?, ?, ?, ?)
    `).run('admin', hash, salt, 'Hotel Management', new Date().toISOString());
  }

  // Seed default branches if none exist
  const branchCount = db.prepare('SELECT COUNT(*) as count FROM branches').get() as { count: number };
  if (branchCount.count === 0) {
    const now = new Date().toISOString();
    const insertBranch = db.prepare(`
      INSERT INTO branches (name, code, status, qr_token, created_at, updated_at)
      VALUES (?, ?, 'active', ?, ?, ?)
    `);

    insertBranch.run('Redfox Signature ECR', 'ecr', crypto.randomUUID(), now, now);
    insertBranch.run('Redfox Hotel OMR', 'omr', crypto.randomUUID(), now, now);
    insertBranch.run('Redstone City Center', 'city-center', crypto.randomUUID(), now, now);
  }

  // Seed default shifts if none exist
  const shiftCount = db.prepare('SELECT COUNT(*) as count FROM shifts').get() as { count: number };
  if (shiftCount.count === 0) {
    const now = new Date().toISOString();
    const insertShift = db.prepare(`
      INSERT INTO shifts (name, start_time, end_time, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?)
    `);

    insertShift.run('General Shift', '09:00', '19:00', now, now);
    insertShift.run('Morning Shift', '07:00', '16:00', now, now);
    insertShift.run('Night Shift', '22:00', '07:00', now, now);
  }

  // Seed default employees if none exist
  const empCount = db.prepare('SELECT COUNT(*) as count FROM employees').get() as { count: number };
  if (empCount.count === 0) {
    const now = new Date().toISOString();
    const ecrBranch = db.prepare("SELECT id FROM branches WHERE code = 'ecr'").get() as { id: number };
    const omrBranch = db.prepare("SELECT id FROM branches WHERE code = 'omr'").get() as { id: number };
    const genShift = db.prepare("SELECT id FROM shifts WHERE name = 'General Shift'").get() as { id: number };
    const morningShift = db.prepare("SELECT id FROM shifts WHERE name = 'Morning Shift'").get() as { id: number };
    const nightShift = db.prepare("SELECT id FROM shifts WHERE name = 'Night Shift'").get() as { id: number };

    const insertEmp = db.prepare(`
      INSERT INTO employees (full_name, branch_id, shift_id, weekly_off, status, created_at, updated_at)
      VALUES (?, ?, ?, ?, 'active', ?, ?)
    `);

    if (ecrBranch && genShift) {
      insertEmp.run('Arun Kumar', ecrBranch.id, genShift.id, 'Sunday', now, now);
      insertEmp.run('Priya Sharma', ecrBranch.id, morningShift ? morningShift.id : genShift.id, 'Monday', now, now);
      insertEmp.run('Deepa Sundar', ecrBranch.id, genShift.id, 'Sunday', now, now);
      insertEmp.run('Karthik Raj', ecrBranch.id, nightShift ? nightShift.id : genShift.id, 'Tuesday', now, now);
    }
    if (omrBranch && genShift) {
      insertEmp.run('Rajesh Kannan', omrBranch.id, genShift.id, 'Sunday', now, now);
      insertEmp.run('Anitha Murugan', omrBranch.id, morningShift ? morningShift.id : genShift.id, 'Sunday', now, now);
    }
  }
}

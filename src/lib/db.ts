import fs from 'fs';
import path from 'path';
import os from 'os';
import crypto from 'crypto';
import initSqlJs from 'sql.js';

export interface RunResult {
  lastInsertRowid: number;
  changes: number;
}

export interface Statement {
  get<T = any>(...params: any[]): T | undefined;
  all<T = any>(...params: any[]): T[];
  run(...params: any[]): RunResult;
}

export class SqliteDatabaseAdapter {
  private db: any;
  private saveCallback: () => void;
  private inTransaction = false;

  constructor(sqlDb: any, saveCallback?: () => void) {
    this.db = sqlDb;
    this.saveCallback = saveCallback || (() => {});
  }

  private save() {
    if (!this.inTransaction) {
      this.saveCallback();
    }
  }

  exec(sql: string) {
    this.db.exec(sql);
    this.save();
  }

  pragma(pragmaStr: string) {
    try {
      this.db.exec(`PRAGMA ${pragmaStr}`);
    } catch {
      // Ignore unsupported PRAGMAs in Wasm
    }
  }

  prepare(sql: string): Statement {
    const adapter = this;
    return {
      get<T = any>(...params: any[]): T | undefined {
        const flattened = params.length === 1 && Array.isArray(params[0]) ? params[0] : params;
        const stmt = adapter.db.prepare(sql);
        stmt.bind(flattened);
        let result: T | undefined = undefined;
        if (stmt.step()) {
          result = stmt.getAsObject() as T;
        }
        stmt.free();
        return result;
      },

      all<T = any>(...params: any[]): T[] {
        const flattened = params.length === 1 && Array.isArray(params[0]) ? params[0] : params;
        const stmt = adapter.db.prepare(sql);
        stmt.bind(flattened);
        const rows: T[] = [];
        while (stmt.step()) {
          rows.push(stmt.getAsObject() as T);
        }
        stmt.free();
        return rows;
      },

      run(...params: any[]): RunResult {
        const flattened = params.length === 1 && Array.isArray(params[0]) ? params[0] : params;
        const stmt = adapter.db.prepare(sql);
        stmt.run(flattened);
        stmt.free();

        let lastInsertRowid = 0;
        try {
          const res = adapter.db.exec('SELECT last_insert_rowid() as id');
          lastInsertRowid = res[0]?.values[0]?.[0] || 0;
        } catch {
          // Ignore
        }

        adapter.save();
        return { lastInsertRowid: Number(lastInsertRowid), changes: 1 };
      },
    };
  }

  transaction<T>(fn: (...args: any[]) => T): (...args: any[]) => T {
    return (...args: any[]): T => {
      this.inTransaction = true;
      try {
        this.db.exec('BEGIN TRANSACTION');
      } catch {
        // Ignore if already open
      }
      try {
        const result = fn(...args);
        try {
          this.db.exec('COMMIT');
        } catch {
          // Ignore
        }
        this.inTransaction = false;
        this.saveCallback();
        return result;
      } catch (err) {
        try {
          this.db.exec('ROLLBACK');
        } catch {
          // Ignore rollback error if no transaction is active
        }
        this.inTransaction = false;
        throw err;
      }
    };
  }
}

// Get safe writable directory (handles Vercel / AWS Lambda read-only filesystem)
export function getWritableDataDir(): string {
  const isServerless =
    process.env.VERCEL === '1' ||
    process.env.AWS_LAMBDA_FUNCTION_NAME !== undefined;

  if (isServerless) {
    const tmpDir = path.join(os.tmpdir(), 'redfox_data');
    if (!fs.existsSync(tmpDir)) {
      try {
        fs.mkdirSync(tmpDir, { recursive: true });
        return tmpDir;
      } catch {
        return os.tmpdir();
      }
    }
    return tmpDir;
  }

  // Local directory
  const localDir = path.join(process.cwd(), 'data');
  if (!fs.existsSync(localDir)) {
    try {
      fs.mkdirSync(localDir, { recursive: true });
    } catch {
      return os.tmpdir();
    }
  }
  return localDir;
}

export function getPhotosDir(): string {
  const isServerless =
    process.env.VERCEL === '1' ||
    process.env.AWS_LAMBDA_FUNCTION_NAME !== undefined;

  if (isServerless) {
    const tmpDir = path.join(os.tmpdir(), 'redfox_photos');
    if (!fs.existsSync(tmpDir)) {
      try {
        fs.mkdirSync(tmpDir, { recursive: true });
        return tmpDir;
      } catch {
        return os.tmpdir();
      }
    }
    return tmpDir;
  }

  const localDir = path.join(process.cwd(), 'data', 'photos');
  if (!fs.existsSync(localDir)) {
    try {
      fs.mkdirSync(localDir, { recursive: true });
    } catch {
      return os.tmpdir();
    }
  }
  return localDir;
}

export const PHOTOS_DIR = getPhotosDir();

let dbInstance: SqliteDatabaseAdapter | null = null;
let dbInitPromise: Promise<SqliteDatabaseAdapter> | null = null;

export async function getDb(): Promise<SqliteDatabaseAdapter> {
  if (dbInstance) return dbInstance;
  if (dbInitPromise) return dbInitPromise;

  dbInitPromise = (async () => {
    // Locate sql-wasm.wasm
    const potentialWasmPaths = [
      path.join(process.cwd(), 'public', 'sql-wasm.wasm'),
      path.join(process.cwd(), 'data', 'sql-wasm.wasm'),
      path.join(process.cwd(), 'node_modules', 'sql.js', 'dist', 'sql-wasm.wasm'),
      path.join(__dirname, 'sql-wasm.wasm'),
      path.join(__dirname, '..', '..', 'public', 'sql-wasm.wasm'),
      path.join(__dirname, '..', '..', 'node_modules', 'sql.js', 'dist', 'sql-wasm.wasm'),
    ];

    let wasmUint8: Uint8Array | undefined;
    for (const p of potentialWasmPaths) {
      try {
        if (fs.existsSync(p)) {
          const wasmBinary = fs.readFileSync(p);
          wasmUint8 = new Uint8Array(wasmBinary.buffer, wasmBinary.byteOffset, wasmBinary.byteLength);
          break;
        }
      } catch {
        // try next path
      }
    }

    // Serverless fallback: if binary cannot be resolved from disk in Lambda, fetch from CDN
    if (!wasmUint8) {
      try {
        const res = await fetch('https://cdn.jsdelivr.net/npm/sql.js@1.12.0/dist/sql-wasm.wasm');
        if (res.ok) {
          const arrayBuffer = await res.arrayBuffer();
          wasmUint8 = new Uint8Array(arrayBuffer);
        }
      } catch (err) {
        console.warn('Wasm CDN fallback error:', err);
      }
    }

    const SQL = await initSqlJs(wasmUint8 ? ({ wasmBinary: wasmUint8 } as any) : undefined);

    const dataDir = getWritableDataDir();
    const dbPath = path.join(dataDir, 'attendance.db');

    let rawDb: any;
    if (fs.existsSync(dbPath)) {
      try {
        const fileBuffer = fs.readFileSync(dbPath);
        rawDb = new SQL.Database(fileBuffer);
      } catch {
        rawDb = new SQL.Database();
      }
    } else {
      rawDb = new SQL.Database();
    }

    const saveToDisk = () => {
      try {
        const data = rawDb.export();
        const buffer = Buffer.from(data);
        fs.writeFileSync(dbPath, buffer);
      } catch (err) {
        console.error('Failed to persist database file:', err);
      }
    };

    const adapter = new SqliteDatabaseAdapter(rawDb, saveToDisk);
    initTables(adapter);
    saveToDisk();

    dbInstance = adapter;
    return dbInstance;
  })();

  return dbInitPromise;
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

function initTables(db: SqliteDatabaseAdapter) {
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

import fs from 'fs';
import path from 'path';
import initSqlJs from 'sql.js';

class SqliteDatabaseAdapter {
  constructor(sqlDb, saveCallback) {
    this.db = sqlDb;
    this.save = saveCallback || (() => {});
  }

  exec(sql) {
    this.db.exec(sql);
    this.save();
  }

  pragma(str) {
    try {
      this.db.exec(`PRAGMA ${str}`);
    } catch {
      // Ignore unsupported pragmas
    }
  }

  prepare(sql) {
    const adapter = this;
    return {
      get(...params) {
        // Flatten params if passed as an array
        const flattened = params.length === 1 && Array.isArray(params[0]) ? params[0] : params;
        const stmt = adapter.db.prepare(sql);
        stmt.bind(flattened);
        let result = undefined;
        if (stmt.step()) {
          result = stmt.getAsObject();
        }
        stmt.free();
        return result;
      },

      all(...params) {
        const flattened = params.length === 1 && Array.isArray(params[0]) ? params[0] : params;
        const stmt = adapter.db.prepare(sql);
        stmt.bind(flattened);
        const rows = [];
        while (stmt.step()) {
          rows.push(stmt.getAsObject());
        }
        stmt.free();
        return rows;
      },

      run(...params) {
        const flattened = params.length === 1 && Array.isArray(params[0]) ? params[0] : params;
        const stmt = adapter.db.prepare(sql);
        stmt.run(flattened);
        stmt.free();

        // Get last insert row id
        let lastInsertRowid = 0;
        try {
          const res = adapter.db.exec('SELECT last_insert_rowid() as id');
          lastInsertRowid = res[0]?.values[0]?.[0] || 0;
        } catch {
          // Ignore
        }

        adapter.save();
        return { lastInsertRowid, changes: 1 };
      },
    };
  }

  transaction(fn) {
    return (...args) => {
      this.db.exec('BEGIN TRANSACTION');
      try {
        const result = fn(...args);
        this.db.exec('COMMIT');
        this.save();
        return result;
      } catch (err) {
        this.db.exec('ROLLBACK');
        throw err;
      }
    };
  }
}

async function test() {
  const wasmPath = path.join(process.cwd(), 'public', 'sql-wasm.wasm');
  const wasmBinary = fs.readFileSync(wasmPath);
  const SQL = await initSqlJs({ wasmBinary });
  const rawDb = new SQL.Database();
  const db = new SqliteDatabaseAdapter(rawDb, () => console.log('[Save called]'));

  db.exec('CREATE TABLE test (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT);');
  const res = db.prepare('INSERT INTO test (name) VALUES (?)').run('Arun Kumar');
  console.log('Insert result:', res);

  const getRes = db.prepare('SELECT * FROM test WHERE name = ?').get('Arun Kumar');
  console.log('Get result:', getRes);

  const allRes = db.prepare('SELECT * FROM test').all();
  console.log('All result:', allRes);

  const countRes = db.prepare('SELECT COUNT(*) as count FROM test').get();
  console.log('Count result:', countRes);
}

test().catch(console.error);

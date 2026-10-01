import fs from 'fs';
import path from 'path';
import initSqlJs from 'sql.js';

async function test() {
  const wasmBinary = fs.readFileSync(path.join(process.cwd(), 'node_modules', 'sql.js', 'dist', 'sql-wasm.wasm'));
  const SQL = await initSqlJs({ wasmBinary });
  const db = new SQL.Database();

  db.run(`
    CREATE TABLE branches (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      code TEXT UNIQUE NOT NULL
    );
  `);

  const stmt = db.prepare('INSERT INTO branches (name, code) VALUES (?, ?)');
  stmt.run(['Redfox ECR', 'ecr']);
  stmt.free();

  const idRes = db.exec('SELECT last_insert_rowid() as id');
  const lastId = idRes[0].values[0][0];
  console.log('Inserted ID:', lastId);

  const selectStmt = db.prepare('SELECT * FROM branches WHERE code = ?');
  selectStmt.bind(['ecr']);
  if (selectStmt.step()) {
    console.log('Fetched object:', selectStmt.getAsObject());
  }
  selectStmt.free();

  // Test export to buffer and reload
  const binaryArray = db.export();
  const buffer = Buffer.from(binaryArray);
  const db2 = new SQL.Database(buffer);
  const res2 = db2.exec('SELECT * FROM branches');
  console.log('Reloaded from buffer:', res2[0].values);
}

test().catch(console.error);

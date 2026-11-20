import fs from 'node:fs/promises';
import path from 'node:path';
import { hashPassword } from './password.mjs';
export function wrapDatabase(db) {
  const query = (sql, params = []) => db.query(sql, params);
  return {
    query,
    exec: sql => db.exec ? db.exec(sql) : db.query(sql),
    async transaction(fn) {
      if (db.transaction) return db.transaction(tx => fn({
        query: (s, p = []) => tx.query(s, p)
      }));
      const client = await db.connect();
      try {
        await client.query('BEGIN');
        const result = await fn(client);
        await client.query('COMMIT');
        return result;
      } catch (e) {
        await client.query('ROLLBACK');
        throw e;
      } finally {
        client.release();
      }
    },
    close: () => db.close ? db.close() : db.end()
  };
}
export async function initialize(db) {
  await db.query('CREATE TABLE IF NOT EXISTS schema_version(version INTEGER PRIMARY KEY)');
  if (!(await db.query('SELECT * FROM schema_version WHERE version=1')).rows.length) {
    await db.exec('BEGIN;' + (await fs.readFile('sql/01-schema.sql', 'utf8')) + '\n' + (await fs.readFile('sql/02-seed.sql', 'utf8')) + '\nINSERT INTO schema_version VALUES(1);COMMIT;');
  }
  if (!(await db.query('SELECT * FROM schema_version WHERE version=2')).rows.length) {
    await db.transaction(async tx => {
      const migration = await fs.readFile('sql/04-application.sql', 'utf8');
      // PGlite query accepts one statement; execute migration outside parameterized query via splitting at semicolons.
      for (const statement of migration.split(';').filter(s => s.trim())) await tx.query(statement);
      const password = await hashPassword('VaultDemo123!');
      await tx.query("INSERT INTO app_users(name,email,password_hash,role) VALUES ('Priya Menon','admin@vault.bank',$1,'admin'),('Vikram Singh','employee@vault.bank',$1,'employee')", [password]);
      await tx.query("INSERT INTO app_users(name,email,password_hash,role,customer_id) SELECT name,email,$1,'customer',id FROM customers", [password]);
      await tx.query('INSERT INTO schema_version VALUES(2)');
    });
  }
  if (!(await db.query('SELECT * FROM schema_version WHERE version=3')).rows.length) {
    // Preserve removed supporting data before simplifying an existing installation.
    const backup = {};
    for (const table of ['knowledge', 'activity_log', 'login_attempts']) {
      if ((await db.query("SELECT to_regclass($1) AS name", [table])).rows[0].name) backup[table] = (await db.query('SELECT * FROM ' + table)).rows;
    }
    if (Object.keys(backup).length) {
      await fs.mkdir('data/backups', {
        recursive: true
      });
      await fs.writeFile('data/backups/before-simplification-' + Date.now() + '.json', JSON.stringify(backup, null, 2));
    }
    await db.transaction(async tx => {
      for (const table of ['knowledge', 'activity_log', 'login_attempts']) await tx.query('DROP TABLE IF EXISTS ' + table);
      await tx.query('INSERT INTO schema_version VALUES(3)');
    });
  }
  return db;
}
async function connect() {
  let engine;
  if (process.env.DATABASE_URL) {
    const {
      Pool
    } = await import('pg');
    engine = new Pool({
      connectionString: process.env.DATABASE_URL
    });
  } else {
    await fs.mkdir(path.join(process.cwd(), 'data'), {
      recursive: true
    });
    const {
      PGlite
    } = await import('@electric-sql/pglite');
    engine = new PGlite(path.join(process.cwd(), 'data/bank'));
    await engine.waitReady;
  }
  return initialize(wrapDatabase(engine));
}
export function getDb() {
  globalThis.bankDbPromise ??= connect().catch(e => {
    globalThis.bankDbPromise = undefined;
    throw e;
  });
  return globalThis.bankDbPromise;
}

// Each suite gets a disposable, seeded database on the local Compose server.
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
import { wrapDatabase } from '../lib/db.mjs';
export async function testDatabase() {
  const { createPool } = await import('mysql2/promise');
  const name = 'vault_test_' + randomUUID().replaceAll('-', '');
  const admin = (input, args = []) => execFileSync('docker', ['compose','exec','-T','mysql','mysql','-uroot','-pvault_root_demo',...args], {input});
  admin('CREATE DATABASE ' + name);
  const pool = createPool('mysql://bank_admin:bank_demo@127.0.0.1:3307/' + name);
  try {
    admin("GRANT ALL ON " + name + ".* TO 'bank_admin'@'%'");
    admin(readFileSync('sql/01-schema.sql'), [name]);
    admin(readFileSync('sql/02-seed.sql'), [name]);
  } catch (e) {
    await pool.end();
    admin('DROP DATABASE ' + name);
    throw e;
  }
  return {...wrapDatabase(pool), async close() {
    await pool.end();
    admin('DROP DATABASE ' + name);
  }};
}

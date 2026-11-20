import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';
import { queries } from '../lib/queries.mjs';
test('Banking database: integrity, reports, rollback and privileges', async () => {
  const db = new PGlite();
  await db.waitReady;
  try {
    await db.exec(await fs.readFile('sql/01-schema.sql', 'utf8'));
    await db.exec(await fs.readFile('sql/02-seed.sql', 'utf8'));
    const q = async (s, p = []) => (await db.query(s, p)).rows;
    assert.equal((await q('SELECT count(*)::int AS n FROM accounts'))[0].n, 10);
    assert.equal((await q('SELECT count(*)::int AS n FROM transfers'))[0].n, 80);
    assert.equal((await q('SELECT count(*)::int AS n FROM audit_log'))[0].n, 160);
    for (const report of queries) assert.ok((await q(report.sql)).length, report.title);
    const total = (await q('SELECT sum(balance) AS total FROM accounts'))[0].total;
    await q("SELECT transfer_funds(1,2,123.45,'Test transfer')");
    assert.equal((await q('SELECT sum(balance) AS total FROM accounts'))[0].total, total);
    assert.equal((await q('SELECT count(*)::int AS n FROM audit_log'))[0].n, 162);
    const before = await q('SELECT id,balance FROM accounts ORDER BY id');
    for (const sql of ["SELECT transfer_funds(1,2,999999999,'Too large')", "SELECT transfer_funds(1,1,1,'Same account')", "SELECT transfer_funds(1,10,1,'Frozen')", "SELECT transfer_funds(1,99,1,'Missing')", "SELECT transfer_funds(1,2,-1,'Negative')", "SELECT transfer_funds(1,2,1.001,'Fraction')"]) {
      await assert.rejects(q(sql));
    }
    assert.deepEqual(await q('SELECT id,balance FROM accounts ORDER BY id'), before);
    assert.equal((await q('SELECT count(*)::int AS n FROM audit_log'))[0].n, 162);
    assert.equal((await q('SELECT monthly_emi(1200,0,12) AS emi'))[0].emi, '100.00');
    assert.equal((await q("SELECT count(*)::int AS n FROM customers WHERE kyc @> '{\"verified\":true}'"))[0].n, 7);
    // Install grants only, then verify expected privilege denials explicitly.
    const privilege = (await fs.readFile('sql/03-privileges.sql', 'utf8')).split('-- Demonstrate authorization')[0];
    await db.exec(privilege);
    await q('SET ROLE bank_auditor');
    await q('SELECT * FROM accounts');
    await assert.rejects(q('UPDATE accounts SET balance=balance+1 WHERE id=1'), /permission denied/);
    await assert.rejects(q("SELECT transfer_funds(1,2,1,'denied')"), /permission denied/);
    await q('RESET ROLE');
    await q('SET ROLE bank_teller');
    await q("SELECT transfer_funds(1,2,100,'Teller')");
    await assert.rejects(q('DELETE FROM customers WHERE id=8'), /permission denied/);
    await q('RESET ROLE');
  } finally {
    await db.close();
  }
});

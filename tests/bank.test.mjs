import { test } from 'node:test';
import assert from 'node:assert/strict';
import { testDatabase } from './mysql.mjs';
import { queries } from '../lib/queries.mjs';
test('Banking database: integrity, reports, rollback', async () => {
  const db = await testDatabase();
  try {
    const q = async (s, p = []) => (await db.query(s, p)).rows;
    assert.equal((await q('SELECT count(*) AS n FROM accounts'))[0].n, 10);
    assert.equal((await q('SELECT count(*) AS n FROM transfers'))[0].n, 80);
    assert.equal((await q('SELECT count(*) AS n FROM audit_log'))[0].n, 160);
    for (const report of queries) assert.ok((await q(report.sql)).length, report.title);
    const total = (await q('SELECT sum(balance) AS total FROM accounts'))[0].total;
    await q("SELECT transfer_funds(1,2,123.45,'Test transfer')");
    assert.equal((await q('SELECT sum(balance) AS total FROM accounts'))[0].total, total);
    assert.equal((await q('SELECT count(*) AS n FROM audit_log'))[0].n, 162);
    const before = await q('SELECT id,balance FROM accounts ORDER BY id');
    for (const sql of ["SELECT transfer_funds(1,2,999999999,'Too large')", "SELECT transfer_funds(1,1,1,'Same account')", "SELECT transfer_funds(1,10,1,'Frozen')", "SELECT transfer_funds(1,99,1,'Missing')", "SELECT transfer_funds(1,2,-1,'Negative')", "SELECT transfer_funds(1,2,1.001,'Fraction')"]) {
      await assert.rejects(q(sql));
    }
    assert.deepEqual(await q('SELECT id,balance FROM accounts ORDER BY id'), before);
    assert.equal((await q('SELECT count(*) AS n FROM audit_log'))[0].n, 162);
    assert.equal((await q('SELECT monthly_emi(1200,0,12) AS emi'))[0].emi, '100.00');
    assert.equal((await q("SELECT count(*) AS n FROM customers WHERE JSON_CONTAINS(kyc,'{\"verified\":true}')"))[0].n, 7);
  } finally {
    await db.close();
  }
});

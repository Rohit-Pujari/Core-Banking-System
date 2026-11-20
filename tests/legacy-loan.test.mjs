import { test } from 'node:test';
import assert from 'node:assert/strict';
import { needsLoanCredit } from '../lib/loan-status.mjs';
import { POST } from '../app/api/bank/route.js';

test('previous approval can be paid once while keeping the original review', async () => {
  const loan = { id: 20, status: 'Active', customer_id: 3, principal: '5000.00', reviewed_by: 1, reviewed_at: '2026-11-18', account_id: null };
  assert.equal(needsLoanCredit({...loan, reviewed_by: null, reviewed_at: null}), false);
  let balance = 0;
  const tx = { query: async (sql, params) => {
    if (sql.startsWith('SELECT * FROM loans')) return {rows:[loan]};
    if (sql.startsWith('UPDATE accounts')) {
      assert.equal(params[2], loan.customer_id);
      if (params[1] !== 7) return {affectedRows:0};
      balance += Number(params[0]);
      return {affectedRows:1};
    }
    assert.equal(sql, 'UPDATE loans SET account_id=? WHERE id=?');
    loan.account_id = params[0];
  }};
  globalThis.bankDbPromise = Promise.resolve({query:async () => ({rows:[{role:'admin',id:2}]}), transaction:fn => fn(tx)});
  const credit = account_id => POST(new Request('http://localhost/api/bank',{method:'POST',headers:{cookie:'vault_session=test'},body:JSON.stringify({action:'loan-credit',id:20,account_id})}));
  try {
    assert.equal((await credit(99)).status,400);
    assert.equal((await credit(7)).status,200);
    assert.equal((await credit(7)).status,400);
    assert.equal(balance,5000);
  } finally { delete globalThis.bankDbPromise; }
});

import { test } from 'node:test';
import assert from 'node:assert/strict';
import {POST} from '../app/api/bank/route.js';

test('partial payment, stale submission and final payoff', async () => {
  const loan = {id: 3, status:'Active', account_id:7, amount_paid:'0.00', remaining:'100.00'};
  let balance = 100;
  const tx = {query: async (sql, params) => {
    if (sql.startsWith('SELECT')) {
      assert.deepEqual(params,[3,2]);
      return {rows:[loan]};
    }
    if (sql.startsWith('UPDATE accounts')) {
      if (params[1] !== 7 || params[2] !== 2 || balance < Number(params[0])) return {affectedRows:0};
      balance -= Number(params[0]);
      return {affectedRows:1};
    }
    assert.ok(sql.startsWith('UPDATE loans'));
    loan.status = params[1];
    loan.amount_paid = (Number(loan.amount_paid)+Number(params[0])).toFixed(2);
    loan.remaining = (100-Number(loan.amount_paid)).toFixed(2);
  }};
  globalThis.bankDbPromise = Promise.resolve({query:async()=>({rows:[{role:'customer',customer_id:2}]}),transaction:fn=>fn(tx)});
  const pay = (amount, previous_paid, account_id=7) => POST(new Request('http://localhost/api/bank',{method:'POST',headers:{cookie:'vault_session=test'},body:JSON.stringify({action:'loan-payment',id:3,account_id,amount,previous_paid})}));
  try {
    assert.equal((await pay('101','0.00')).status,400);
    assert.equal((await pay('1','0.00',9)).status,400);
    assert.equal((await pay('20.25','0.00')).status,200);
    assert.equal((await pay('20.25','0.00')).status,400);
    assert.equal(balance,79.75);
    assert.equal((await pay('79.75','20.25')).status,200);
    assert.equal(loan.status,'Closed');
    assert.equal(balance,0);
    assert.equal((await pay('1','100.00')).status,400);
  } finally {delete globalThis.bankDbPromise;}
});

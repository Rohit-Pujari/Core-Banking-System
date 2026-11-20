import { test } from 'node:test';
import assert from 'node:assert/strict';
import { testDatabase } from './mysql.mjs';
import { GET as session, POST as authenticate, DELETE as logout } from '../app/api/auth/route.js';
import { GET, POST } from '../app/api/bank/route.js';
import { digest } from '../lib/password.mjs';
const request = (path, body, cookie = '', method = body ? 'POST' : 'GET', origin = 'http://localhost') => new Request('http://localhost' + path, {
  method,
  headers: {
    'Content-Type': 'application/json',
    cookie,
    origin
  },
  ...(body ? {
    body: JSON.stringify(body)
  } : {})
});
test('Application sessions, ownership and customer/employee/admin workflows', async () => {
  const db = await testDatabase();
  globalThis.bankDbPromise = Promise.resolve(db);
  try {
    async function login(email) {
      const r = await authenticate(request('/api/auth', {
        action: 'login',
        email,
        password: 'VaultDemo123!'
      }));
      assert.equal(r.status, 200, JSON.stringify(await r.clone().json()));
      return r.headers.get('set-cookie').split(';')[0];
    }
    async function call(body, cookie) {
      return POST(request('/api/bank', body, cookie));
    }
    assert.equal((await GET(request('/api/bank'))).status, 401);
    assert.equal((await call({
      action: 'kyc',
      id: 5
    }, '')).status, 401);
    assert.equal((await authenticate(request('/api/auth', {
      action: 'login',
      email: 'aarav@example.com',
      password: 'wrong'
    }))).status, 401);
    const aarav = await login('aarav@example.com'),
      diya = await login('diya@example.com'),
      employee = await login('employee@vault.bank'),
      admin = await login('admin@vault.bank');
    assert.match(aarav, /vault_session=/);
    const mine = await (await GET(request('/api/bank', null, aarav))).json();
    assert.equal(mine.user.role, 'customer');
    assert.equal(mine.accounts.length, 2);
    assert.ok(mine.accounts.every(a => a.customer_id === 1));
    assert.equal(mine.customers.length, 1);
    assert.equal(mine.customers[0].id, 1);
    assert.equal(mine.audit.length, 0);
    assert.equal(mine.users.length, 0);
    assert.ok(mine.loans.every(l => l.customer_id === 1));
    assert.ok(mine.transfers.every(t => [1, 9].includes(t.from_account) || [1, 9].includes(t.to_account)));
    assert.equal((await GET(request('/api/bank?report=0', null, aarav))).status, 403);
    assert.equal((await GET(request('/api/bank?report=0', null, employee))).status, 200);
    assert.equal((await GET(request('/api/bank?report=0', null, admin))).status, 200);
    assert.equal((await call({
      action: 'transfer',
      from: 2,
      destination: 'VB10001',
      amount: '1'
    }, aarav)).status, 403);
    const before = (await db.query('SELECT sum(balance) AS total FROM accounts')).rows[0].total;
    assert.equal((await call({
      action: 'transfer',
      from: 1,
      destination: 'VB10002',
      amount: '150.25',
      note: 'Customer payment'
    }, aarav)).status, 200);
    assert.equal((await db.query('SELECT sum(balance) AS total FROM accounts')).rows[0].total, before);
    const after = (await db.query('SELECT count(*) AS n FROM audit_log')).rows[0].n;
    assert.equal((await call({
      action: 'transfer',
      from: 1,
      destination: 'VB10002',
      amount: '9999999999'
    }, aarav)).status, 400);
    assert.equal((await db.query('SELECT count(*) AS n FROM audit_log')).rows[0].n, after);
    assert.equal((await call({
      action: 'transfer',
      from: 1,
      destination: 'VB10001',
      amount: '1'
    }, aarav)).status, 400);
    for (const action of ['deposit', 'customer', 'employee', 'account', 'account-status', 'loan-review', 'kyc']) assert.equal((await call({
      action,
      id: 1,
      status: 'Active'
    }, aarav)).status, 403, action);
    assert.equal((await call({
      action: 'employee'
    }, employee)).status, 403);
    assert.equal((await call({
      action: 'kyc',
      id: 5
    }, employee)).status, 200);
    assert.equal((await call({
      action: 'account',
      customer_id: 5,
      branch_id: 2,
      kind: 'Savings'
    }, employee)).status, 200);
    const opened = (await db.query('SELECT id,balance FROM accounts WHERE customer_id=5 ORDER BY id DESC LIMIT 1')).rows[0];
    assert.equal(Number(opened.balance), 0);
    assert.equal((await call({ action: 'deposit', id: opened.id, amount: '500.25' }, employee)).status, 200);
    const audit = (await db.query('SELECT old_balance,new_balance FROM audit_log WHERE account_id=? ORDER BY id DESC LIMIT 1', [opened.id])).rows[0];
    assert.deepEqual([Number(audit.old_balance), Number(audit.new_balance)], [0, 500.25]);
    assert.equal((await call({
      action: 'account-status',
      id: 1,
      status: 'Frozen'
    }, employee)).status, 200);
    assert.equal((await call({
      action: 'transfer',
      from: 1,
      destination: 'VB10002',
      amount: '1'
    }, aarav)).status, 400);
    assert.equal((await call({
      action: 'account-status',
      id: 1,
      status: 'Active'
    }, employee)).status, 200);
    assert.equal((await call({
      action: 'loan',
      account_id: 2,
      kind: 'Personal loan',
      principal: '50000',
      months: '24'
    }, diya)).status, 200);
    const balanceBeforeLoan = async () => Number((await db.query('SELECT balance FROM accounts WHERE id=2')).rows[0].balance);
    const originalBalance = await balanceBeforeLoan();
    const pending = (await db.query("SELECT id FROM loans WHERE customer_id=2 AND status='Pending'")).rows[0].id;
    assert.equal((await call({
      action: 'loan-review',
      id: pending,
      status: 'Active'
    }, employee)).status, 403);
    assert.equal((await call({
      action: 'loan-review',
      id: pending,
      status: 'Active'
    }, admin)).status, 200);
    assert.equal((await call({
      action: 'loan-review',
      id: pending,
      status: 'Rejected'
    }, admin)).status, 400);
    assert.equal((await call({action:'loan-review', id:pending, status:'Active'}, admin)).status, 400);
    assert.equal(await balanceBeforeLoan(), originalBalance + 50000);
    const registration = await authenticate(request('/api/auth', {
      action: 'register',
      name: 'New Customer',
      phone: '9876543210',
      email: 'new@example.com',
      password: 'StrongPassword123',
      role: 'admin'
    }));
    assert.equal(registration.status, 200);
    assert.match(registration.headers.get('set-cookie'), /HttpOnly/);
    assert.match(registration.headers.get('set-cookie'), /SameSite=Lax/);
    const registered = await registration.json();
    assert.equal(registered.user.role, 'customer');
    const countBefore = (await db.query('SELECT count(*) AS n FROM customers')).rows[0].n;
    assert.equal((await authenticate(request('/api/auth', {
      action: 'register',
      name: 'Duplicate',
      phone: '9876543210',
      email: 'new@example.com',
      password: 'StrongPassword123'
    }))).status, 400);
    assert.equal((await db.query('SELECT count(*) AS n FROM customers')).rows[0].n, countBefore);
    const newCookie = registration.headers.get('set-cookie').split(';')[0];
    const newData = await (await GET(request('/api/bank', null, newCookie))).json();
    assert.equal(newData.accounts.length, 0);
    assert.equal(newData.transfers.length, 0);
    assert.equal(newData.loans.length, 0);
    assert.equal((await call({
      action: 'account',
      customer_id: registered.user.customer_id,
      branch_id: 1,
      kind: 'Savings'
    }, employee)).status, 400);
    assert.equal((await call({
      action: 'customer',
      name: 'Staff Onboarded',
      email: 'onboard@example.com',
      phone: '9876543211',
      password: 'VaultDemo123!'
    }, employee)).status, 200);
    assert.equal((await login('onboard@example.com')).startsWith('vault_session='), true);
    assert.equal((await call({
      action: 'employee',
      name: 'New Employee',
      email: 'newstaff@example.com',
      password: 'VaultDemo123!'
    }, admin)).status, 200);
    const badOrigin = await POST(request('/api/bank', {
      action: 'kyc',
      id: 1
    }, admin, 'POST', 'https://evil.example'));
    assert.equal(badOrigin.status, 403);
    assert.equal((await logout(request('/api/auth', null, aarav, 'DELETE'))).status, 200);
    assert.equal((await GET(request('/api/bank', null, aarav))).status, 401);
    const token = diya.split('=')[1];
    await db.query("UPDATE app_sessions SET expires_at=now()-INTERVAL 1 SECOND WHERE token_hash=?", [digest(token)]);
    assert.equal((await GET(request('/api/bank', null, diya))).status, 401);
    assert.equal((await (await session(request('/api/auth', null, diya))).json()).user, null);
  } finally {
    await db.close();
    delete globalThis.bankDbPromise;
  }
});

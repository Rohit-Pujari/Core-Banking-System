import { getDb } from '../../../lib/db.mjs';
import { queries } from '../../../lib/queries.mjs';
import { requireUser, checkOrigin, HttpError, failure } from '../../../lib/auth.mjs';
import { hashPassword } from '../../../lib/password.mjs';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
const reply = data => Response.json(data, {
  headers: {
    'Cache-Control': 'no-store'
  }
});
const staff = user => {
  if (user.role === 'customer') throw new HttpError('Staff access is required.', 403);
};
const admin = user => {
  if (user.role !== 'admin') throw new HttpError('Administrator access is required.', 403);
};
const id = value => {
  const n = Number(value);
  if (!Number.isSafeInteger(n) || n <= 0) throw new HttpError('Invalid record.');
  return n;
};
export async function GET(request) {
  try {
    const user = await requireUser(request),
      db = await getDb(),
      url = new URL(request.url),
      report = url.searchParams.get('report');
    if (report !== null) {
      staff(user);
      if (!/^\d+$/.test(report) || !queries[Number(report)]) throw new HttpError('Unknown report.');
      return reply((await db.query(queries[Number(report)].sql)).rows);
    }
    const customer = user.role === 'customer',
      params = customer ? [user.customer_id] : [],
      result = {
        user
      };
    const sqls = {
      accounts: `SELECT a.*,c.name,b.name AS branch FROM accounts a JOIN customers c ON c.id=a.customer_id JOIN branches b ON b.id=a.branch_id ${customer ? 'WHERE a.customer_id=?' : ''} ORDER BY a.id`,
      customers: `SELECT * FROM customers ${customer ? 'WHERE id=?' : ''} ORDER BY id`,
      transfers: `SELECT t.*,s.number AS source,d.number AS destination,c.name FROM transfers t JOIN accounts s ON s.id=t.from_account JOIN accounts d ON d.id=t.to_account JOIN customers c ON c.id=s.customer_id ${customer ? 'WHERE s.customer_id=? OR d.customer_id=?' : ''} ORDER BY t.created_at DESC,t.id DESC LIMIT 100`,
      loans: `SELECT l.*,c.name,monthly_emi(principal,rate,months) AS emi FROM loans l JOIN customers c ON c.id=l.customer_id ${customer ? 'WHERE l.customer_id=?' : ''} ORDER BY l.id`
    };
    for (const [key, sql] of Object.entries(sqls)) result[key] = (await db.query(sql, customer && key === 'transfers' ? [...params, ...params] : params)).rows;
    result.branches = (await db.query(queries[2].sql)).rows;
    result.volume = user.role === 'customer' ? [] : (await db.query(queries[3].sql)).rows;
    result.audit = user.role === 'admin' ? (await db.query('SELECT * FROM audit_log ORDER BY id DESC LIMIT 100')).rows : [];
    result.users = user.role === 'admin' ? (await db.query('SELECT id,name,email,role FROM app_users ORDER BY id')).rows : [];
    return reply(result);
  } catch (e) {
    return failure(e);
  }
}
export async function POST(request) {
  try {
    checkOrigin(request);
    const user = await requireUser(request),
      db = await getDb(),
      b = await request.json();
    if (b.action === 'profile') {
      if (user.role !== 'customer') throw new HttpError('Customer access is required.', 403);
      const occupation = typeof b.occupation === 'string' ? b.occupation.trim() : '';
      const phone = typeof b.phone === 'string' ? b.phone.trim() : '';
      if (!occupation || occupation.length > 100 || !/^\d{10}$/.test(phone)) {
        throw new HttpError('Enter an occupation and a 10-digit mobile number.');
      }
      await db.query("UPDATE customers SET phone=?, kyc=JSON_SET(kyc,'$.occupation',?) WHERE id=?",
        [phone, occupation, user.customer_id]);
      return reply({ message: 'Profile updated.' });
    }
    if (b.action === 'deposit') {
      staff(user);
      const amount = String(b.amount);
      if (!/^\d{1,12}(\.\d{1,2})?$/.test(amount) || Number(amount) <= 0) {
        throw new HttpError('Enter a positive deposit amount with at most two decimals.');
      }
      const result = await db.query(
        "UPDATE accounts SET balance=balance+CAST(? AS DECIMAL(16,2)) WHERE id=? AND status='Active' AND balance<=99999999999999.99-CAST(? AS DECIMAL(16,2))",
        [amount, id(b.id), amount]
      );
      if (!result.affectedRows) throw new HttpError('Deposit requires an active account with room for this amount.');
      return reply({ message: 'Cash deposit recorded.' });
    }
    if (b.action === 'transfer') {
      if (!/^\d{1,12}(\.\d{1,2})?$/.test(String(b.amount)) || Number(b.amount) <= 0) throw new HttpError('Enter a positive amount with at most two decimals.');
      const source = id(b.from),
        destination = String(b.destination || '').trim();
      if (!destination) throw new HttpError('Enter a recipient account number.');
      const result = await db.transaction(async tx => {
        const account = (await tx.query('SELECT * FROM accounts WHERE id=?', [source])).rows[0];
        if (!account || user.role === 'customer' && account.customer_id !== user.customer_id) throw new HttpError('You cannot transfer from this account.', 403);
        const target = (await tx.query('SELECT id FROM accounts WHERE number=?', [destination])).rows[0];
        if (!target) throw new HttpError('Recipient account was not found.');
        let transfer;
        try {
          transfer = (await tx.query('SELECT transfer_funds(?,?,?,?) AS id', [source, target.id, b.amount, String(b.note || 'Account transfer').slice(0, 200)])).rows[0];
        } catch (e) {
          if (e.sqlState === '45000') throw new HttpError(e.message);
          throw e;
        }
        return transfer;
      });
      return reply({
        message: `Transfer TXN-${result.id} completed successfully.`
      });
    }
    if (b.action === 'loan') {
      if (user.role !== 'customer') throw new HttpError('Loan applications must be submitted by a customer.', 403);
      const principal = String(b.principal || ''),
        months = Number(b.months),
        rates = {
          'Home loan': 8.5,
          'Education loan': 7.5,
          'Vehicle loan': 9.2,
          'Personal loan': 12
        };
      if (!rates[b.kind] || !/^\d{1,10}(\.\d{1,2})?$/.test(principal) || Number(principal) < 1000 || Number(principal) > 10000000 || !Number.isInteger(months) || months < 6 || months > 360) throw new HttpError('Choose a loan product, ₹1,000–₹1 crore and a term of 6–360 months.');
      await db.transaction(async tx => {
        await tx.query("INSERT INTO loans(customer_id,kind,principal,rate,months,status) VALUES(?,?,?,?,?,'Pending')", [user.customer_id, b.kind, principal, rates[b.kind], months]);
      });
      return reply({
        message: 'Loan application submitted. Your bank will review it.'
      });
    }
    if (b.action === 'loan-review') {
      admin(user);
      if (!['Active', 'Rejected'].includes(b.status)) throw new HttpError('Invalid review decision.');
      await db.transaction(async tx => {
        const loan = await tx.query("UPDATE loans SET status=?,reviewed_by=?,reviewed_at=now() WHERE id=? AND status='Pending'", [b.status, user.id, id(b.id)]);
        if (!loan.affectedRows) throw new HttpError('This loan is no longer pending.');
      });
      return reply({
        message: 'Loan decision recorded. Approval does not automatically disburse funds.'
      });
    }
    if (b.action === 'kyc') {
      staff(user);
      await db.transaction(async tx => {
        const r = await tx.query("UPDATE customers SET kyc=JSON_SET(kyc,'$.verified',JSON_EXTRACT('true','$')) WHERE id=?", [id(b.id)]);
        if (!r.affectedRows) throw new HttpError('Customer was not found.');
      });
      return reply({
        message: 'Customer KYC verified.'
      });
    }
    if (b.action === 'account-status') {
      staff(user);
      if (!['Active', 'Frozen'].includes(b.status)) throw new HttpError('Invalid account status.');
      await db.transaction(async tx => {
        const r = await tx.query("UPDATE accounts SET status=? WHERE id=? AND status IN ('Active','Frozen')", [b.status, id(b.id)]);
        if (!r.affectedRows) throw new HttpError('Account cannot be changed.');
      });
      return reply({
        message: 'Account status updated.'
      });
    }
    if (b.action === 'account') {
      staff(user);
      if (!['Savings', 'Current'].includes(b.kind)) throw new HttpError('Choose an account type.');
      await db.transaction(async tx => {
        const owner = (await tx.query('SELECT kyc FROM customers WHERE id=? FOR UPDATE', [id(b.customer_id)])).rows[0];
        if (!owner) throw new HttpError('Customer was not found.');
        if (!owner.kyc.verified) throw new HttpError('Verify customer KYC before opening an account.');
        const branch = (await tx.query('SELECT id FROM branches WHERE id=?', [id(b.branch_id)])).rows[0];
        if (!branch) throw new HttpError('Branch was not found.');
        await tx.query("INSERT INTO accounts(number,customer_id,branch_id,kind,balance) VALUES(CONCAT('VB',UUID_SHORT()),?,?,?,0)", [id(b.customer_id), branch.id, b.kind]);
      });
      return reply({
        message: 'Account opened with a zero balance. It can receive internal transfers.'
      });
    }
    if (b.action === 'customer' || b.action === 'employee') {
      staff(user);
      if (b.action === 'employee') admin(user);
      const name = String(b.name || '').trim(),
        email = String(b.email || '').trim().toLowerCase(),
        password = String(b.password || '');
      if (!name || name.length > 100 || !/^\S+@\S+\.\S+$/.test(email) || email.length > 254 || password.length < 10 || password.length > 128) throw new HttpError('Enter a name, valid email and password of 10–128 characters.');
      if (b.action === 'customer' && !/^\d{10}$/.test(String(b.phone || ''))) throw new HttpError('Enter a 10-digit phone number.');
      const hash = await hashPassword(password);
      await db.transaction(async tx => {
        let customerId = null;
        if (b.action === 'customer') customerId = (await tx.query('INSERT INTO customers(name,email,phone,kyc) VALUES(?,?,?,?)', [name, email, b.phone, JSON.stringify({
          verified: false,
          occupation: String(b.occupation || 'Unspecified').slice(0, 100),
          risk: 'medium'
        })])).insertId;
        await tx.query('INSERT INTO app_users(name,email,password_hash,role,customer_id) VALUES(?,?,?,?,?)', [name, email, hash, b.action === 'employee' ? 'employee' : 'customer', customerId]);
      });
      return reply({
        message: `${b.action === 'employee' ? 'Employee' : 'Customer'} created. They can now sign in with the supplied credentials.`
      });
    }
    throw new HttpError('Unknown action.');
  } catch (e) {
    if (e.code === 'ER_DUP_ENTRY') return failure(new HttpError('This email or account is already registered.'));
    return failure(e);
  }
}

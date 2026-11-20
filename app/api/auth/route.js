import { getDb } from '../../../lib/db.mjs';
import { hashPassword, verifyPassword, digest } from '../../../lib/password.mjs';
import { currentUser, createSession, checkOrigin, HttpError, failure, tokenFrom, publicUser } from '../../../lib/auth.mjs';
const attempts = new Map();
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export async function GET(request) {
  try {
    return Response.json({
      user: await currentUser(request)
    }, {
      headers: {
        'Cache-Control': 'no-store'
      }
    });
  } catch (e) {
    return failure(e);
  }
}
export async function POST(request) {
  try {
    checkOrigin(request);
    const b = await request.json();
    const db = await getDb();
    const email = String(b.email || '').trim().toLowerCase();
    const password = String(b.password || '');
    if (email.length > 254 || password.length > 128 || !/^\S+@\S+\.\S+$/.test(email) || !password) throw new HttpError('Enter a valid email and password.');
    if (b.action === 'register') {
      const name = String(b.name || '').trim(),
        phone = String(b.phone || '');
      if (!name || name.length > 100 || !/^\d{10}$/.test(phone) || password.length < 10) throw new HttpError('Enter your name, 10-digit phone number and a password of at least 10 characters.');
      const hash = await hashPassword(password);
      const user = await db.transaction(async tx => {
        const c = (await tx.query("INSERT INTO customers(name,email,phone,kyc) VALUES(?,?,?,'{\"verified\":false,\"risk\":\"medium\",\"occupation\":\"Unspecified\"}')", [name, email, phone])).insertId;
        const created = await tx.query("INSERT INTO app_users(name,email,password_hash,role,customer_id) VALUES(?,?,?,'customer',?)", [name, email, hash, c]);
        return { id: created.insertId, name, email, role: 'customer', customer_id: c };
      });
      return Response.json({
        user: publicUser(user)
      }, {
        headers: {
          'Set-Cookie': await createSession(db, user.id, request),
          'Cache-Control': 'no-store'
        }
      });
    }
    if (b.action !== 'login') throw new HttpError('Unknown action.');
    const now = Date.now();
    for (const [key, value] of attempts) if (now - value.start > 900000) attempts.delete(key);
    const attempt = attempts.get(email) || {
      count: 0,
      start: now
    };
    attempt.count++;
    attempts.set(email, attempt);
    if (attempt.count > 10) throw new HttpError('Too many attempts. Please try again in 15 minutes.', 429);
    const user = (await db.query('SELECT * FROM app_users WHERE email=?', [email])).rows[0];
    // Perform the same password derivation for unknown accounts.
    const valid = await verifyPassword(password, user?.password_hash || '0'.repeat(32) + ':' + '0'.repeat(128));
    if (!user || !valid) throw new HttpError('Incorrect email or password.', 401);
    attempts.delete(email);
    return Response.json({
      user: publicUser(user)
    }, {
      headers: {
        'Set-Cookie': await createSession(db, user.id, request),
        'Cache-Control': 'no-store'
      }
    });
  } catch (e) {
    if (e.code === 'ER_DUP_ENTRY') return failure(new HttpError('This email is already registered.'));
    return failure(e);
  }
}
export async function DELETE(request) {
  try {
    checkOrigin(request);
    const db = await getDb();
    await db.query('DELETE FROM app_sessions WHERE token_hash=?', [digest(tokenFrom(request))]);
    return Response.json({
      message: 'Signed out.'
    }, {
      headers: {
        'Set-Cookie': 'vault_session=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0',
        'Cache-Control': 'no-store'
      }
    });
  } catch (e) {
    return failure(e);
  }
}

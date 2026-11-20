import { randomBytes } from 'node:crypto';
import { getDb } from './db.mjs';
import { digest } from './password.mjs';
export class HttpError extends Error {
  constructor(message, status = 400) {
    super(message);
    this.status = status;
  }
}
export const publicUser = u => ({
  id: u.id,
  name: u.name,
  email: u.email,
  role: u.role,
  customer_id: u.customer_id
});
export function tokenFrom(request) {
  return (request.headers.get('cookie') || '').split(';').map(v => v.trim()).find(v => v.startsWith('vault_session='))?.slice(14) || '';
}
export async function currentUser(request) {
  const token = tokenFrom(request);
  if (!token) return null;
  const db = await getDb();
  return (await db.query('SELECT u.id,u.name,u.email,u.role,u.customer_id FROM app_sessions s JOIN app_users u ON u.id=s.user_id WHERE s.token_hash=? AND s.expires_at>now()', [digest(token)])).rows[0] || null;
}
export async function requireUser(request, roles) {
  const user = await currentUser(request);
  if (!user) throw new HttpError('Please sign in to continue.', 401);
  if (roles && !roles.includes(user.role)) throw new HttpError('You do not have permission for this action.', 403);
  return user;
}
export function checkOrigin(request) {
  if (request.headers.get('sec-fetch-site') === 'cross-site') throw new HttpError('Cross-site requests are not allowed.', 403);
  const origin = request.headers.get('origin');
  if (!origin) return;
  // Next.js may build request.url with its bind address (0.0.0.0).
  // Host preserves the address the browser actually requested, including its port.
  const url = new URL(request.url);
  const host = request.headers.get('host') || url.host;
  try {
    const expected = new URL(`${url.protocol}//${host}`);
    const supplied = new URL(origin);
    if (!['http:', 'https:'].includes(supplied.protocol) || supplied.origin !== origin || supplied.origin !== expected.origin) throw new Error('Origin mismatch');
  } catch {
    throw new HttpError('Request origin is not allowed.', 403);
  }
}
export async function createSession(db, userId, request) {
  const token = randomBytes(32).toString('hex');
  await db.query("INSERT INTO app_sessions(token_hash,user_id,expires_at) VALUES(?,?,now()+INTERVAL 8 HOUR)", [digest(token), userId]);
  return `vault_session=${token}; HttpOnly; SameSite=Lax; Path=/; Max-Age=28800${new URL(request.url).protocol === 'https:' ? '; Secure' : ''}`;
}
export function failure(e) {
  if (!e.status) console.error(e);
  return Response.json({
    error: e.status ? e.message : 'Unable to complete the operation. Please try again.'
  }, {
    status: e.status || 500,
    headers: {
      'Cache-Control': 'no-store'
    }
  });
}

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { checkOrigin } from '../lib/auth.mjs';
const request = (origin, host = 'localhost:3000', extra = {}) => new Request('http://0.0.0.0:3000/api/auth', {
  method: 'POST',
  headers: {
    origin,
    host,
    ...extra
  }
});
test('Accept the browser host when Next.js uses an internal bind address', () => {
  for (const host of ['localhost:3000', '127.0.0.1:3000', '192.168.1.10:3000', 'localhost:3001']) assert.doesNotThrow(() => checkOrigin(request('http://' + host, host)));
});
test('Reject mismatched origins, schemes, ports, opaque origins and cross-site requests', () => {
  for (const origin of ['https://evil.example', 'http://localhost:3001', 'https://localhost:3000', 'null', 'invalid']) assert.throws(() => checkOrigin(request(origin)), {
    status: 403
  });
  assert.throws(() => checkOrigin(request('http://localhost:3000', 'localhost:3000', {
    'sec-fetch-site': 'cross-site'
  })), {
    status: 403
  });
  assert.throws(() => checkOrigin(request('https://evil.example', 'localhost:3000', {
    'x-forwarded-host': 'evil.example'
  })), {
    status: 403
  });
});
test('Use request URL when Host is absent', () => {
  assert.doesNotThrow(() => checkOrigin(new Request('http://localhost/api/auth', {
    headers: {
      origin: 'http://localhost'
    }
  })));
});

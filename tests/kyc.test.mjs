import test from 'node:test';
import assert from 'node:assert/strict';
import { BSON } from 'mongodb';
import { GET, POST } from '../app/api/kyc-document/route.js';

test('KYC files belong to the signed-in customer and staff can retrieve the original bytes', async () => {
  let user = { role: 'customer', customer_id: 1 };
  const files = new Map();
  globalThis.bankDbPromise = Promise.resolve({ query: async () => ({ rows: [user] }) });
  globalThis.kycMongo = { db: () => ({ collection: () => ({
    updateOne: async ({ _id }, { $set }) => files.set(_id, BSON.deserialize(BSON.serialize($set))),
    findOne: async ({ _id }, { projection }) => {
      const doc = files.get(_id);
      return doc ? (projection.bytes ? doc : { size: doc.size }) : null;
    }
  }) }) };
  const url = 'http://localhost/api/kyc-document?customer=2';
  const headers = { cookie: 'vault_session=example', 'content-type': 'application/pdf' };
  const upload = body => POST(new Request(url, { method: 'POST', headers, body }));
  try {
    assert.equal((await upload('not PDF')).status, 400);
    assert.equal((await upload(Buffer.alloc(2097153))).status, 413);
    assert.equal((await upload('%PDF-demo')).status, 200);
    assert.equal(files.has(2), false);
    user = { role: 'customer', customer_id: 2 };
    assert.equal(await (await GET(new Request(url, { headers }))).json(), null);
    user = { role: 'employee' };
    assert.equal((await upload('%PDF-demo')).status, 403);
    const response = await GET(new Request(url.replace('customer=2', 'customer=1&download=1'), { headers }));
    assert.equal(await response.text(), '%PDF-demo');
  } finally {
    delete globalThis.bankDbPromise;
    delete globalThis.kycMongo;
  }
});

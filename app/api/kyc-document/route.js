import { MongoClient } from 'mongodb';
import { requireUser, checkOrigin, HttpError, failure } from '../../../lib/auth.mjs';

const limit = 2 * 1024 * 1024;
async function uploads() {
  globalThis.kycMongo ??= new MongoClient(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27018', { serverSelectionTimeoutMS: 3000 });
  return globalThis.kycMongo.db('vault_documents').collection('kyc_uploads');
}

export async function POST(request) {
  try {
    checkOrigin(request);
    const user = await requireUser(request, ['customer']);
    if (request.headers.get('content-type') !== 'application/pdf') throw new HttpError('Choose a PDF file.');
    const reader = request.body?.getReader();
    if (!reader) throw new HttpError('Choose a PDF file.');
    const chunks = [];
    let size = 0;
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.length;
      if (size > limit) {
        await reader.cancel();
        throw new HttpError('Maximum file size is 2 MB.', 413);
      }
      chunks.push(value);
    }
    const bytes = Buffer.concat(chunks);
    if (bytes.subarray(0, 5).toString() !== '%PDF-') throw new HttpError('The selected file must be a PDF.');
    const collection = await uploads();
    await collection.updateOne({ _id: user.customer_id }, { $set: { bytes, size, uploaded_at: new Date() } }, { upsert: true });
    return Response.json({ message: 'Document saved.' });
  } catch (e) { return failure(e); }
}

export async function GET(request) {
  try {
    const user = await requireUser(request, ['customer', 'employee', 'admin']);
    const params = new URL(request.url).searchParams;
    const id = user.role === 'customer' ? user.customer_id : Number(params.get('customer'));
    if (!Number.isSafeInteger(id) || id <= 0) throw new HttpError('Select a customer.');
    const download = params.has('download');
    const collection = await uploads();
    const doc = await collection.findOne({ _id: id }, { projection: download ? { bytes: 1 } : { uploaded_at: 1, size: 1 } });
    const headers = { 'Cache-Control': 'private, no-store' };
    if (!download) return Response.json(doc, { headers });
    if (!doc) throw new HttpError('No document uploaded.', 404);
    return new Response(doc.bytes.value(), { headers: { ...headers, 'Content-Type': 'application/pdf', 'Content-Disposition': 'attachment; filename="kyc-document.pdf"', 'X-Content-Type-Options': 'nosniff' } });
  } catch (e) { return failure(e); }
}

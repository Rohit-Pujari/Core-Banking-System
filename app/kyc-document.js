'use client';

import { useEffect, useState } from 'react';

export default function KycDocument({ customer, canUpload = false }) {
  const url = '/api/kyc-document?customer=' + customer;
  const [doc, setDoc] = useState(undefined);
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    let active = true;
    fetch(url).then(async response => {
      const data = await response.json();
      if (!response.ok) throw Error(data.error);
      if (active) setDoc(data);
    }).catch(e => { if (active) setMessage(e.message); });
    return () => { active = false; };
  }, [url]);

  async function submit(event) {
    event.preventDefault();
    const form = event.currentTarget;
    const file = form.elements.proof.files[0];
    if (!file || file.size > 2097152) return setMessage('Choose a PDF up to 2 MB.');
    setBusy(true);
    try {
      const response = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/pdf' }, body: file });
      const data = await response.json();
      if (!response.ok) throw Error(data.error);
      setDoc({ size: file.size });
      setMessage('Document saved.');
      form.reset();
    } catch (e) { setMessage(e.message); }
    finally { setBusy(false); }
  }
  return <section className="panel"><h3>KYC document</h3>
    {doc ? <a href={url + '&download=1'}>Download PDF ({Math.ceil(doc.size / 1024)} KB)</a> : doc === null && <p>No document uploaded.</p>}
    {canUpload && <form onSubmit={submit}><label>Identity proof (PDF, up to 2 MB) <input name="proof" type="file" accept="application/pdf" required /></label>
      <button className="button secondary" disabled={busy || doc === undefined}>{busy ? 'Uploading…' : doc ? 'Replace document' : 'Upload document'}</button></form>}
    {message && <p role="status">{message}</p>}
  </section>;
}

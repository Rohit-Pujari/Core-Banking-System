'use client';

import { useEffect, useRef } from 'react';
import { X, ArrowUpRight } from 'lucide-react';
const titles = {
  transfer: 'Send money',
  profile: 'Edit profile',
  deposit: 'Record cash deposit',
  customer: 'Add customer',
  account: 'Open an account',
  loan: 'Apply for a loan',
  employee: 'Add employee'
};
export default function BankingModal({
  action,
  data,
  error,
  busy,
  onClose,
  onSubmit,
  depositAccount,
  loanProduct = 'Home loan'
}) {
  const dialog = useRef(null),
    close = useRef(onClose);
  close.current = onClose;
  useEffect(() => {
    const previous = document.activeElement;
    dialog.current?.querySelector('input,select')?.focus();
    const key = e => {
      if (e.key === 'Escape') {
        e.preventDefault();
        close.current();
      }
      if (e.key === 'Tab') {
        const controls = [...dialog.current.querySelectorAll('button:not(:disabled),input,select')];
        const first = controls[0],
          last = controls.at(-1);
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last?.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first?.focus();
        }
      }
    };
    document.addEventListener('keydown', key);
    return () => {
      document.removeEventListener('keydown', key);
      previous?.focus();
    };
  }, []);
  return <div className="modal-backdrop" onClick={e => {
    if (e.target === e.currentTarget) onClose();
  }}><section ref={dialog} className="modal" role="dialog" aria-modal="true" aria-labelledby="modal-title"><div className="panel-heading"><div><span className="eyebrow">VAULT BANKING</span><h2 id="modal-title">{titles[action]}</h2></div><button className="close" aria-label="Close dialog" onClick={onClose}><X /></button></div><form onSubmit={onSubmit}>
 {action === 'profile' && <>
   <label>Occupation<input name="occupation" defaultValue={data.customers[0].kyc.occupation || ''} maxLength={100} required /></label>
   <label>Mobile number<input name="phone" type="tel" defaultValue={data.customers[0].phone} pattern="[0-9]{10}" maxLength={10} required /></label>
 </>}
 {action === 'deposit' && <><p>{depositAccount.name} · {depositAccount.number}</p><input name="id" type="hidden" value={depositAccount.id} /><label>Cash received (INR)<input name="amount" type="number" min="0.01" max="999999999999.99" step="0.01" required /></label></>}
 {action === 'transfer'  && <><p className="form-note">Transfers are available between active Vault accounts. Check the recipient account number before confirming.</p>{!data.accounts.some(a => a.status === 'Active') && <p className="error">There are no active accounts available to send money. Contact your branch for help.</p>}<label>From account<select name="from" required>{data.accounts.filter(a => a.status === 'Active').map(a => <option key={a.id} value={a.id}>{a.number} · ₹{Number(a.balance).toLocaleString('en-IN')}</option>)}</select></label><label>Recipient account number<input name="destination" required placeholder="e.g. VB10002" maxLength={40} /></label><label>Amount (INR)<input name="amount" type="number" min="0.01" max="999999999999" step="0.01" required placeholder="0.00" /></label><label>Message (optional)<input name="note" maxLength={200} placeholder="What's this payment for?" /></label></>}
 {['customer', 'employee'].includes(action) && <><label>Full name<input name="name" required maxLength={100} autoComplete="name" /></label><label>Email address<input name="email" type="email" required autoComplete="off" /></label><label>Initial password<input name="password" type="password" minLength={10} maxLength={128} required autoComplete="new-password" placeholder="At least 10 characters" /></label>{action === 'customer' && <><label>Mobile number<input name="phone" pattern="[0-9]{10}" maxLength={10} required /></label><label>Occupation<input name="occupation" maxLength={100} /></label></>}<p className="form-note">Share the initial credentials with the account holder so they can sign in.</p></>}
 {action === 'account' && <><p className="form-note">KYC must be verified. New accounts open with a zero balance and can receive cash deposits or internal transfers.</p><label>Customer<select name="customer_id" required>{data.customers.map(c => <option key={c.id} value={c.id}>{c.name} · {c.kyc.verified ? 'Verified' : 'KYC pending'}</option>)}</select></label><label>Account type<select name="kind"><option>Savings</option><option>Current</option></select></label><label>Branch<select name="branch_id">{data.branches.map(b => <option key={b.id} value={b.id}>{b.name} · {b.city}</option>)}</select></label></>}
 {action === 'loan' && <><p className="form-note">{data.accounts.some(a => a.status === 'Active') ? 'Approval credits the full principal to the selected account.' : 'An active account is required to receive loan funds.'}</p><label>Receive funds in<select name="account_id" required defaultValue=""><option value="" disabled>Select account</option>{data.accounts.filter(a => a.status === 'Active').map(a => <option key={a.id} value={a.id}>{a.number} · {a.kind}</option>)}</select></label><label>Loan product<select name="kind" defaultValue={loanProduct}><option>Home loan</option><option>Education loan</option><option>Vehicle loan</option><option>Personal loan</option></select></label><label>Amount (INR)<input name="principal" type="number" min="1000" max="10000000" step="0.01" required /></label><label>Repayment term (months)<input name="months" type="number" min="6" max="360" step="1" defaultValue="60" required /></label><p className="form-note">Annual rates: home 8.5% · education 7.5% · vehicle 9.2% · personal 12%. EMI is calculated from your product, amount and term.</p></>}
 {error && <p className="error" role="alert">{error}</p>}<button className="button primary submit" disabled={busy || action === 'transfer' && !data.accounts.some(a => a.status === 'Active')}>{busy ? 'Processing…' : action === 'profile' ? 'Save changes' : action === 'deposit' ? 'Confirm deposit' : action === 'transfer' ? 'Confirm transfer' : action === 'loan' ? 'Submit application' : 'Save and continue'}<ArrowUpRight size={17} /></button></form></section></div>;
}

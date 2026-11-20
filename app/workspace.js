'use client';

import KycDocument from './kyc-document';

import { useEffect, useState, useRef } from 'react';
import { Landmark, LayoutDashboard, Users, Wallet, ArrowLeftRight, HandCoins, Database, ShieldCheck, Search, ArrowUpRight, Plus, X, ChevronRight, RefreshCw, CheckCircle2 } from 'lucide-react';
import Access from './access';
import CustomerPortal from './customer';
import BankingModal from './forms';
import { Stat, Person, Badge, Table, Transfers, RawTable } from './ui';
import { queries } from '../lib/queries.mjs';
const money = v => new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 2
}).format(Number(v));
const nav = [['Overview', LayoutDashboard], ['Customers', Users], ['Accounts', Wallet], ['Transactions', ArrowLeftRight], ['Loans', HandCoins], ['Reports', Database], ['Audit trail', ShieldCheck], ['Team', Users]];
export default function Bank() {
  const sessionGeneration = useRef(0);
  const [user, setUser] = useState(null),
    [checking, setChecking] = useState(true);
  const [depositAccount, setDepositAccount] = useState(null);
  const [reviewCustomer, setReviewCustomer] = useState(null);
  const [page, setPage] = useState('Overview'),
    [data, setData] = useState(null),
    [filter, setFilter] = useState(''),
    [modal, setModal] = useState(null),
    [notice, setNotice] = useState(''),
    [error, setError] = useState(''),
    [busy, setBusy] = useState(false),
    [report, setReport] = useState(0),
    [rows, setRows] = useState(null);
  async function load() {
    const generation = sessionGeneration.current;
    try {
      const r = await fetch('/api/bank');
      const d = await r.json();
      if (generation !== sessionGeneration.current) return;
      if (r.status === 401) {
        setUser(null);
        setData(null);
        setModal(null);
        setRows(null);
        return;
      }
      if (!r.ok) throw Error(d.error);
      setUser(d.user);
      setData(d);
      setError('');
    } catch (e) {
      setError(e.message);
    }
  }
  useEffect(() => {
    fetch('/api/auth').then(r => r.json()).then(d => {
      setUser(d.user);
      if (d.user) load();
    }).catch(() => setError('Unable to connect. Please try again.')).finally(() => setChecking(false));
  }, []);
  async function logout() {
    try {
      const r = await fetch('/api/auth', {
        method: 'DELETE'
      });
      if (!r.ok) throw Error('Unable to sign out.');
      sessionGeneration.current++;
      setUser(null);
      setData(null);
      setModal(null);
      setRows(null);
      setNotice('');
      setError('');
      setPage('Overview');
    } catch (e) {
      setError(e.message);
    }
  }
  async function act(action, values) {
    setBusy(true);
    setError('');
    try {
      const r = await fetch('/api/bank', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          action,
          ...values
        })
      });
      const d = await r.json();
      if (!r.ok) throw Error(d.error);
      setNotice(d.message);
      await load();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  function go(p) {
    setPage(p);
    setFilter('');
  }
  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setError('');
    const values = Object.fromEntries(new FormData(e.currentTarget));
    try {
      const r = await fetch('/api/bank', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          ...values,
          action: modal
        })
      });
      const d = await r.json();
      if (!r.ok) throw Error(d.error);
      setNotice(d.message);
      setModal(null);
      await load();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  async function run() {
    setBusy(true);
    try {
      const r = await fetch('/api/bank?report=' + report);
      const d = await r.json();
      if (!r.ok) throw Error(d.error);
      setRows(d);
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  const total = data?.accounts.reduce((a, x) => a + Number(x.balance), 0) || 0;
  const volume = data?.volume || [];
  const matches = x => JSON.stringify(x).toLowerCase().includes(filter.toLowerCase());
  if (checking) return <div className="session-loading">Opening Vault…</div>;
  if (!user) return <Access onSignIn={u => {
    sessionGeneration.current++;
    setUser(u);
    setPage('Overview');
    load();
  }} />;
  if (user.role === 'customer') return <CustomerPortal user={user} data={data} error={error} notice={notice} busy={busy} modal={modal} setModal={setModal} setError={setError} onSubmit={submit} onRefresh={load} onLogout={logout} dismiss={() => setNotice('')} />;
  const visibleNav = nav.filter(([name]) => user.role === 'admin' || !['Audit trail', 'Team'].includes(name));
  const openAction = page === 'Customers' ? 'customer' : page === 'Accounts' ? 'account' : page === 'Team' ? 'employee' : 'transfer';
  return <div className="shell"><aside><a className="brand" href="/" aria-label="Vault home"><span className="brandmark"><Landmark size={23} /></span>vault<span className="branddot">.</span></a><div className="workspace-label">{user.role === 'admin' ? 'ADMINISTRATION' : 'BANK OPERATIONS'}</div><nav>{visibleNav.map(([name, Icon]) => <button key={name} className={page === name ? 'nav active' : 'nav'} onClick={() => go(name)}><Icon size={19} />{name}{name === 'Reports' && <span className="tiny">7</span>}</button>)}</nav><div className="sidebar-bottom"><div className="profile"><div className="avatar">{user.name.split(' ').map(x => x[0]).join('')}</div><div><strong>{user.name}</strong><small>{user.role === 'admin' ? 'Administrator' : 'Bank employee'}</small></div></div></div></aside><div className="main"><header><div className="crumb">Workspace <ChevronRight size={14} /> <b>{page}</b></div><div className="header-right"><span className="environment"><span className="live-dot" /> Demo environment</span><button className="signout" onClick={logout}>Sign out</button></div></header><main><div className="page-heading"><div><div className="eyebrow">VAULT CORE BANKING</div><h1>{page === 'Overview' ? 'Bank overview' : page}</h1><p>{{
                Overview: 'Deposits, customers, transfers and active loans.',
                Customers: 'Register customers and verify pending KYC.',
                Accounts: 'Manage deposits and monitor account balances.',
                Transactions: 'Search internal transfers by account, reference or description.',
                Loans: 'Monitor lending, exposure and monthly repayments.',
                Reports: 'Customer deposits, branch structure and transfer reports.',
                'Audit trail': 'Automatic history of account balance changes.',
                Team: 'Manage the people who serve your customers.'
              }[page]}</p></div><div className="actions"><button className="button secondary icon-button" onClick={load} aria-label="Refresh data"><RefreshCw size={16} /></button><button className="button primary" onClick={() => {
              setError('');
              setModal(openAction);
            }}><Plus size={17} />{{
                customer: 'Add customer',
                account: 'Open account',
                employee: 'Add employee',
                transfer: 'New transfer'
              }[openAction]}</button></div></div>
 {notice && <div className="notice"><CheckCircle2 size={17} />{notice}<button onClick={() => setNotice('')} aria-label="Dismiss notification"><X size={16} /></button></div>}{error && <div role="alert" className="error">{error}</div>}
 {!data ? <div className="panel loading">{error ? 'Unable to load the bank. Use refresh to retry.' : 'Opening your banking workspace…'}</div> : <>
 {page === 'Overview' && <><div className="stats"><Stat label="TOTAL DEPOSITS" value={money(total)} icon={Wallet} sub={`${data.accounts.length} accounts across ${data.branches.length} branches`} /><Stat label="CUSTOMERS" value={data.customers.length.toString().padStart(2, '0')} icon={Users} sub={`${data.customers.filter(x => x.kyc.verified).length} KYC verified`} /><Stat label="TRANSFER VOLUME" value={money(data.transfers.reduce((a, x) => a + Number(x.amount), 0))} icon={ArrowLeftRight} sub={`${data.transfers.length} recent transfers`} /><Stat label="LOAN PORTFOLIO" value={money(data.loans.filter(l => l.status === 'Active').reduce((a, x) => a + Number(x.principal), 0))} icon={HandCoins} sub={`${data.loans.filter(x => x.status === 'Active').length} active · ${data.loans.filter(x => x.status === 'Pending').length} pending`} /></div>
 <div className="overview-grid"><section className="panel chart-panel"><div className="panel-heading"><div><h2>Transfer activity</h2><p>Daily value of internal transfers</p></div><span className="badge neutral">Recent activity</span></div><div className="chart"><div className="chart-labels"><span>{money(Math.max(1, ...volume.map(x => Number(x.volume))))}</span><span>Transfer volume (INR)</span><span>0</span></div><div className="bars">{volume.map((x, i) => <div className="bar-group" key={x.day}><div className="bar" title={`${String(x.day).slice(0, 10)}: ${money(x.volume)}`} style={{
                        height: Math.max(4, Number(x.volume) / Math.max(1, ...volume.map(x => Number(x.volume))) * 150) + 'px',
                        background: i === volume.length - 1 ? '#145c43' : undefined
                      }} /><span>{new Date(x.day).toLocaleDateString('en-IN', {
                          day: 'numeric',
                          month: 'short'
                        })}</span></div>)}</div></div><div className="chart-footer"><span className="legend-dot" /> Internal transfers <span className="muted">Live from your ledger</span></div></section><section className="panel health"><div className="health-icon"><ShieldCheck size={25} /></div><span className="eyebrow">SERVICE DESK</span><h2>Pending work</h2><p>Review customers and loan applications.</p><button className="work-item" onClick={() => go('Customers')}><span>KYC awaiting verification</span><b>{data.customers.filter(c => !c.kyc.verified).length}</b><ChevronRight size={15} /></button><button className="work-item" onClick={() => go('Loans')}><span>Pending loan applications</span><b>{data.loans.filter(l => l.status === 'Pending').length}</b><ChevronRight size={15} /></button><button className="text-button" onClick={() => go('Customers')}>Review customers <ArrowUpRight size={16} /></button></section></div>
 <section className="panel"><div className="panel-heading"><div><h2>Recent transactions</h2><p>The latest movements across your accounts</p></div><button className="text-button" onClick={() => go('Transactions')}>View all transactions <ArrowUpRight size={16} /></button></div><Transfers rows={data.transfers.slice(0, 5)} /></section><div className="bottom-note"><ShieldCheck size={14} /> Amounts in INR · Demo data</div></>}
 {['Customers', 'Accounts', 'Transactions', 'Loans', 'Audit trail'].includes(page) && <section className="panel"><div className="panel-heading"><div><h2>{page === 'Audit trail' ? 'Balance change log' : page + ' directory'}</h2><p>{page === 'Audit trail' ? 'Created by the balance_audit trigger, including seeded transfers.' : 'Search and review your bank records'}</p></div><label className="search"><Search size={16} /><input aria-label={'Search ' + page} placeholder="Search records…" value={filter} onChange={e => setFilter(e.target.value)} /></label></div>
 {page === 'Transactions' && <Transfers rows={data.transfers.filter(matches)} />}
 {page === 'Accounts' && <Table headers={['Account / Holder', 'Type', 'Branch', 'Balance', 'Status', 'Cash deposit', 'Action']} rows={data.accounts.filter(matches).map(a => [<Person key={a.id} name={a.name} sub={a.number} />, a.kind, a.branch, <b key="balance">{money(a.balance)}</b>, <Badge key="status" text={a.status} />, <button key="deposit" className="row-action" disabled={busy || a.status !== 'Active'} onClick={() => {
              setDepositAccount(a);
              setError('');
              setModal('deposit');
            }}>Deposit</button>, <button key="action" disabled={busy} className="row-action" onClick={() => act('account-status', {
              id: a.id,
              status: a.status === 'Active' ? 'Frozen' : 'Active'
            })}>{a.status === 'Active' ? 'Freeze' : 'Reactivate'}</button>])} />}
 {page === 'Customers' && reviewCustomer && <KycDocument key={reviewCustomer} customer={reviewCustomer} />}
 {page === 'Customers' && <Table headers={['Customer', 'Contact', 'Occupation', 'KYC', 'Risk', 'Document', 'Action']} rows={data.customers.filter(matches).map(c => [<Person key={c.id} name={c.name} sub={'CIF · ' + String(c.id).padStart(4, '0')} />, <div key="contact">{c.email}<small>{c.phone}</small></div>, c.kyc.occupation, <Badge key="kyc" text={c.kyc.verified ? 'Verified' : 'Pending'} />, c.kyc.risk, <button key="proof" className="row-action" onClick={() => setReviewCustomer(c.id)}>View proof</button>, c.kyc.verified ? '—' : <button key="verify" className="row-action" disabled={busy} onClick={() => act('kyc', {
              id: c.id
            })}>Verify KYC</button>])} />}
 {page === 'Loans' && <Table headers={['Borrower', 'Product', 'Receiving account', 'Principal', 'Rate', 'Monthly EMI', 'Status', ...(user.role === 'admin' ? ['Review'] : [])]} rows={data.loans.filter(matches).map(l => [l.name, l.kind, l.account_number || '—', money(l.principal), l.rate + '%', money(l.emi), <Badge key="status" text={l.status} />, ...(user.role === 'admin' ? [l.status === 'Pending' ? <div className="row-actions" key="review"><form onSubmit={e => {
                e.preventDefault();
                act('loan-review', { id: l.id, status: 'Active', account_id: new FormData(e.currentTarget).get('account_id') });
              }}>
                {!l.account_id && <select name="account_id" aria-label="Receiving account" required defaultValue=""><option value="" disabled>Select receiving account</option>{data.accounts.filter(a => a.customer_id === l.customer_id && a.status === 'Active').map(a => <option key={a.id} value={a.id}>{a.number}</option>)}</select>}
                <button disabled={busy} className="row-action">Approve &amp; credit</button>
              </form><button disabled={busy} className="row-action danger" onClick={() => act('loan-review', {
                id: l.id,
                status: 'Rejected'
              })}>Reject</button></div> : '—'] : [])])} />}
 {page === 'Audit trail' && <Table headers={['Event', 'Account ID', 'Before', 'After', 'Change', 'Timestamp']} rows={data.audit.filter(matches).map(a => ['#' + a.id, a.account_id, money(a.old_balance), money(a.new_balance), money(Number(a.new_balance) - Number(a.old_balance)), new Date(a.created_at).toLocaleString('en-IN')])} />}
 </section>}
 {page === 'Team' && <section className="panel"><div className="panel-heading"><div><h2>Bank team</h2><p>Administrators and employees with access to bank operations</p></div></div><Table headers={['Name', 'Email', 'Role']} rows={data.users.filter(u => u.role !== 'customer').map(u => [u.name, u.email, u.role])} /></section>}
 {page === 'Reports' && <section className="panel"><div className="panel-heading"><div><h2>Bank reports</h2><p>Select a report and load the current records.</p></div><div className="actions"><select aria-label="Report" value={report} onChange={e => {
                  setReport(Number(e.target.value));
                  setRows(null);
                }}>{queries.map((q, i) => <option key={q.title} value={i}>{q.title}</option>)}</select><button className="button primary" disabled={busy} onClick={run}>Load report</button></div></div>{rows ? <RawTable rows={rows} /> : <div className="empty">Select a report to view its results.</div>}</section>}
 </>}
 </main><footer><span>vault. <span className="muted">/ Core Banking System</span></span><span>Vault Bank <span className="footer-dot">●</span> Staff portal</span></footer></div>
 {modal && data && <BankingModal depositAccount={depositAccount} action={modal} data={data} error={error} busy={busy} onClose={() => setModal(null)} onSubmit={submit} />}
 </div>;
}

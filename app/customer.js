'use client';

import KycDocument from './kyc-document';

import { useState } from 'react';
import { Landmark, LayoutDashboard, Wallet, ArrowLeftRight, HandCoins, UserRound, ArrowUpRight, Plus, ShieldCheck, RefreshCw, X, CheckCircle2, ChevronRight, Search } from 'lucide-react';
import { money, Table, Badge, Transfers } from './ui';
import BankingModal from './forms';
const navigation = [['Home', LayoutDashboard], ['My accounts', Wallet], ['Payments', ArrowLeftRight], ['My loans', HandCoins], ['My profile', UserRound]];
export default function CustomerPortal({
  user,
  data,
  error,
  notice,
  busy,
  modal,
  setModal,
  setError,
  onSubmit,
  onRefresh,
  onLogout,
  dismiss
}) {
  const [page, setPage] = useState('Home'),
    [filter, setFilter] = useState(''),
    [loanProduct, setLoanProduct] = useState('Home loan');
  const initials = user.name.split(' ').map(x => x[0]).join(''),
    total = data?.accounts.reduce((sum, a) => sum + Number(a.balance), 0) || 0,
    profile = data?.customers[0];
  function open(action) {
    setError('');
    setModal(action);
  }
  return <div className="shell customer-shell"><aside><a className="brand" href="/"><span className="brandmark"><Landmark size={23} /></span>vault<span className="branddot">.</span></a><div className="workspace-label">PERSONAL BANKING</div><nav>{navigation.map(([label, Icon]) => <button key={label} className={'nav ' + (page === label ? 'active' : '')} onClick={() => {
          setPage(label);
          setFilter('');
        }}><Icon size={19} />{label}</button>)}</nav><div className="sidebar-bottom"><div className="profile"><div className="avatar">{initials}</div><div><strong>{user.name}</strong><small>Personal banking customer</small></div></div></div></aside><div className="main"><header><div className="crumb">Personal banking <ChevronRight size={14} /><b>{page}</b></div><div className="header-right"><span className="environment"><span className="live-dot" /> Signed in</span><button className="signout" onClick={onLogout}>Sign out</button></div></header><main><div className="page-heading"><div><div className="eyebrow">PERSONAL BANKING</div><h1>{page === 'Home' ? 'Account overview' : page}</h1><p>{{
                Home: 'Balances, recent transactions and account services.',
                'My accounts': 'Your Vault accounts and available balances.',
                Payments: 'Send money and keep track of your transactions.',
                'My loans': 'Loan applications, decisions and repayment estimates.',
                'My profile': 'Your personal details and identity verification status.'
              }[page]}</p></div><div className="actions"><button className="button secondary icon-button" onClick={onRefresh} aria-label="Refresh data"><RefreshCw size={16} /></button><button className="button primary" onClick={() => open(page === 'My loans' ? 'loan' : 'transfer')}><Plus size={17} />{page === 'My loans' ? 'Apply for a loan' : 'Send money'}</button></div></div>
 {notice && <div className="notice"><CheckCircle2 size={17} />{notice}<button onClick={dismiss} aria-label="Dismiss notification"><X size={16} /></button></div>}{error && <div className="error" role="alert">{error}</div>}
 {!data ? <div className="panel loading">Loading your accounts…</div> : <>
 {page === 'Home' && <><div className="customer-overview"><section className="balance-hero"><span className="eyebrow">YOUR TOTAL BALANCE</span><strong>{money(total)}</strong><p>Across {data.accounts.length} Vault {data.accounts.length === 1 ? 'account' : 'accounts'}</p><div className="balance-hero-bottom"><span>INR · Indian Rupee</span><Landmark size={33} /></div></section><section className="panel quick-actions"><div className="panel-heading"><h2>Account services</h2></div><button onClick={() => open('transfer')}><span className="quick-icon"><ArrowLeftRight size={21} /></span><div><b>Send money</b><small>Pay another Vault account</small></div><ArrowUpRight size={18} /></button><button onClick={() => open('loan')}><span className="quick-icon"><HandCoins size={21} /></span><div><b>Apply for a loan</b><small>View products and submit an application</small></div><ArrowUpRight size={18} /></button><button onClick={() => setPage('My profile')}><span className="quick-icon"><UserRound size={21} /></span><div><b>Your profile</b><small>Review your KYC status</small></div><ArrowUpRight size={18} /></button></section></div>
 {!profile?.kyc.verified && <div className="kyc-banner"><ShieldCheck size={23} /><div><b>KYC verification pending</b><p>Your KYC is awaiting review. Upload your identity proof in My profile for branch review.</p></div></div>}
 <section className="accounts-section"><div className="section-heading"><h2>Your accounts</h2><button className="text-button" onClick={() => setPage('My accounts')}>View accounts <ArrowUpRight size={15} /></button></div><div className="account-cards">{data.accounts.length ? data.accounts.map(a => <AccountCard key={a.id} account={a} />) : <div className="panel empty">No accounts opened. Complete KYC at your branch to open an account.</div>}</div></section><section className="panel"><div className="panel-heading"><div><h2>Recent activity</h2><p>Incoming and outgoing transfers on your accounts</p></div><button className="text-button" onClick={() => setPage('Payments')}>View all payments <ArrowUpRight size={15} /></button></div><Transfers rows={data.transfers.slice(0, 5)} /></section></>}
 {page === 'My accounts' && <><div className="account-cards">{data.accounts.map(a => <AccountCard key={a.id} account={a} />)}</div><div className="banking-help"><ShieldCheck size={20} /><div><h3>Need another account or help with a frozen account?</h3><p>Contact a Vault branch. Our team can verify your identity, open an account and help with account access.</p></div></div>{!data.accounts.length && <div className="panel empty">No accounts yet. Contact your branch to get started.</div>}</>}
 {page === 'Payments' && <section className="panel"><div className="panel-heading"><div><h2>Payment history</h2><p>Your most recent 100 transfers</p></div><label className="search"><Search size={16} /><input value={filter} onChange={e => setFilter(e.target.value)} placeholder="Search payments…" aria-label="Search your payments" /></label></div><Transfers rows={data.transfers.filter(t => JSON.stringify(t).toLowerCase().includes(filter.toLowerCase()))} /></section>}
 {page === 'My loans' && <><div className="loan-products">{[['Home loan', '8.5%'], ['Education loan', '7.5%'], ['Vehicle loan', '9.2%'], ['Personal loan', '12%']].map(([name, rate]) => <article className="panel loan-product" key={name}><h2>{name}</h2><strong>{rate}</strong><span>Annual interest rate</span><button className="text-button" onClick={() => {
                  setLoanProduct(name);
                  open('loan');
                }}>Apply <ArrowUpRight size={15} /></button></article>)}</div><section className="panel"><div className="panel-heading"><h2>Your loans & applications</h2></div><Table headers={['Loan', 'Receiving account', 'Amount', 'Annual rate', 'Term', 'Monthly EMI', 'Status']} rows={data.loans.map(l => [l.kind, l.account_number || '—', money(l.principal), l.rate + '%', l.months + ' months', money(l.emi), <Badge key="status" text={l.status} />])} /></section><p className="form-note">Pending applications are reviewed by the bank. Approval credits the full loan amount to your selected account.</p></>}
 {page === 'My profile' && <KycDocument customer={user.customer_id} canUpload />}
 {page === 'My profile' && <section className="panel profile-panel"><div className="panel-heading"><div><h2>Personal details</h2><button className="row-action" onClick={() => open('profile')}>Edit profile</button></div><Badge text={profile?.kyc.verified ? 'Verified' : 'Pending'} /></div><div className="profile-details">{[['Full name', user.name], ['Email address', user.email], ['Mobile number', profile?.phone], ['Customer ID', 'CIF-' + String(user.customer_id).padStart(4, '0')], ['Occupation', profile?.kyc.occupation], ['KYC status', profile?.kyc.verified ? 'Identity verified' : 'Awaiting branch verification']].map(([label, value]) => <div key={label}><span>{label}</span><b>{value || '—'}</b></div>)}</div></section>}
 </>}
 </main><footer><span>vault. <span className="muted">/ Personal Banking</span></span><span>Demo environment · INR</span></footer></div>{modal && data && <BankingModal loanProduct={loanProduct} action={modal} data={data} error={error} busy={busy} onClose={() => setModal(null)} onSubmit={onSubmit} />}</div>;
}
function AccountCard({
  account: a
}) {
  return <article className="panel account-card"><div><span className="account-type"><Wallet size={16} />{a.kind} account</span><Badge text={a.status} /></div><p>{a.number}</p><strong>{money(a.balance)}</strong><div className="account-card-footer"><span>{a.branch}</span><span>Available balance</span></div></article>;
}

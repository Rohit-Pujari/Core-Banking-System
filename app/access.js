'use client';

import { useState } from 'react';
import { Landmark, ArrowUpRight, ShieldCheck, Wallet, Users, LockKeyhole } from 'lucide-react';
const demos = [['Customer', 'aarav@example.com'], ['Employee', 'employee@vault.bank'], ['Admin', 'admin@vault.bank']];
export default function Access({
  onSignIn
}) {
  const [register, setRegister] = useState(false),
    [email, setEmail] = useState(''),
    [password, setPassword] = useState(''),
    [busy, setBusy] = useState(false),
    [error, setError] = useState('');
  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      const response = await fetch('/api/auth', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          ...Object.fromEntries(new FormData(e.currentTarget)),
          email,
          password,
          action: register ? 'register' : 'login'
        })
      });
      const result = await response.json();
      if (!response.ok) throw Error(result.error);
      onSignIn(result.user);
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  return <div className="access"><section className="access-story"><a className="brand" href="/"><span className="brandmark"><Landmark size={24} /></span>vault<span className="branddot">.</span></a><div><span className="eyebrow">VAULT BANK</span><h1>Online banking</h1><p>Access accounts, transfer funds and manage loan applications.</p><div className="access-features"><span><Wallet size={18} /> Balances and transaction history</span><span><ShieldCheck size={18} /> Transfers between Vault accounts</span><span><Users size={18} /> Customer and staff access</span></div></div><small>Vault · Core Banking System</small></section><section className="access-form"><div className="signin-card"><div className="access-lock"><LockKeyhole size={24} /></div><span className="eyebrow">ACCOUNT ACCESS</span><h2>{register ? 'Register as a customer' : 'Sign in'}</h2><p>{register ? 'Create your customer profile. Our team will verify your KYC and help open your account.' : 'Sign in to your customer or bank team workspace.'}</p><form onSubmit={submit}>{register && <><label>Full name<input name="name" required maxLength={100} autoComplete="name" /></label><label>Mobile number<input name="phone" pattern="[0-9]{10}" required maxLength={10} autoComplete="tel" placeholder="10-digit mobile number" /></label></>}<label>Email address<input name="email" type="email" value={email} onChange={e => setEmail(e.target.value)} required autoComplete="username" placeholder="you@example.com" /></label><label>Password<input name="password" type="password" value={password} onChange={e => setPassword(e.target.value)} required minLength={register ? 10 : undefined} maxLength={128} autoComplete={register ? 'new-password' : 'current-password'} placeholder={register ? 'At least 10 characters' : 'Enter your password'} /></label>{error && <p className="error" role="alert">{error}</p>}<button className="button primary submit" disabled={busy}>{busy ? 'Please wait…' : register ? 'Create customer profile' : 'Sign in'}<ArrowUpRight size={17} /></button></form><p className="access-switch">{register ? 'Already registered?' : 'New to Vault?'} <button onClick={() => {
            setRegister(!register);
            setError('');
          }}>{register ? 'Sign in' : 'Register'}</button></p><details className="demo-signin"><summary>Demo credentials</summary><div>{demos.map(([role, address]) => <button key={role} type="button" onClick={() => {
              setRegister(false);
              setEmail(address);
              setPassword('VaultDemo123!');
              setError('');
            }}>{role}<ArrowUpRight size={13} /></button>)}</div><small>Choose a demo login, then sign in.<br />Demo password: <code>VaultDemo123!</code></small></details></div></section></div>;
}

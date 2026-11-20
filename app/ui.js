import { ArrowLeftRight } from 'lucide-react';
export const money = v => new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 2
}).format(Number(v));
export function Stat({
  label,
  value,
  icon: Icon,
  sub
}) {
  return <section className="panel stat"><div className="stat-top">{label}<Icon size={18} /></div><strong>{value}</strong><span>{sub}</span></section>;
}
export function Person({
  name,
  sub
}) {
  return <div className="person"><span className="initials">{name.split(' ').map(x => x[0]).join('')}</span><div><b>{name}</b><small>{sub}</small></div></div>;
}
export function Badge({
  text
}) {
  return <span className={'badge ' + (['Active', 'Verified'].includes(text) ? 'success' : text === 'Rejected' ? 'rejected' : 'warning')}>{text}</span>;
}
export function Table({
  headers,
  rows
}) {
  return <div className="table-wrap"><table><thead><tr>{headers.map(h => <th key={h}>{h}</th>)}</tr></thead><tbody>{rows.length ? rows.map((r, i) => <tr key={i}>{r.map((v, j) => <td key={j}>{v}</td>)}</tr>) : <tr><td colSpan={headers.length} className="empty">No records found.</td></tr>}</tbody></table></div>;
}
export function Transfers({
  rows
}) {
  return <Table headers={['Transaction', 'From → To', 'Date & time', 'Amount', 'Status']} rows={rows.map(t => [<div className="person" key="person"><span className="transfer-icon"><ArrowLeftRight size={17} /></span><div><b>{t.narration}</b><small>TXN-{String(t.id).padStart(5, '0')} · {t.name}</small></div></div>, <span className="account-route" key="route">{t.source}<span> → </span>{t.destination}</span>, new Date(t.created_at).toLocaleString('en-IN', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit'
  }), <b key="amount">{money(t.amount)}</b>, <span key="status" className="badge success"><span />Completed</span>])} />;
}
export function RawTable({
  rows
}) {
  return rows.length ? <Table headers={Object.keys(rows[0])} rows={rows.map(r => Object.values(r).map(v => typeof v === 'object' ? JSON.stringify(v) : String(v ?? '—')))} /> : <div className="empty">No results.</div>;
}

'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Sparkles, ArrowUpRight, Check, X, Loader2 } from 'lucide-react';
import { createJarvisDraft, completeJarvisTask, reviewJarvisDraft } from '@/lib/actions/jarvis';
import type { JarvisDraft } from '@/lib/jarvis';

type Draft = JarvisDraft & { id: string; updatedAt: string; donorName: string; donorId: string | null; email: string | null };
type Data = {
  organizationName: string; scope: 'mine' | 'all'; totalDonors: number; openTasks: number; overdueTasks: number; refreshedAt: string;
  tasks: { id: string; title: string; dueDate: string | null; priority: string; owner: string; canComplete: boolean; donorId: string | null; donorName: string | null }[];
  donors: { id: string; name: string; giving: number; risk: string | null; owner: string }[];
  risks: { id: string; name: string; risk: string }[];
  campaigns: { id: string; name: string; goal: number | null; raised: number; status: string; startDate: string | null }[];
  drafts: Draft[];
};
const money = (n: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n);
const date = (d: string | null) => d ? new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', timeZone: 'America/Chicago' }).format(new Date(d)) : 'No date set';
const button = 'inline-flex items-center justify-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50';
const primary = 'inline-flex items-center justify-center gap-2 rounded-lg bg-evergreen px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#0d685f] disabled:opacity-50';
const panel = 'rounded-2xl border border-gray-200 bg-white';

export default function OfficerWorkspace({ data }: { data: Data }) {
  const router = useRouter();
  const [tab, setTab] = useState('Overview');
  const [query, setQuery] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ text: string; error: boolean } | null>(null);
  const [review, setReview] = useState<Draft | null>(null);
  const [briefing, setBriefing] = useState(false);
  const modalOpen = !!review || briefing;
  useEffect(() => {
    if (!modalOpen) return;
    const previous = document.activeElement as HTMLElement | null;
    const dialog = document.querySelector<HTMLElement>('[role=dialog]');
    const focusable = () => Array.from(dialog?.querySelectorAll<HTMLElement>('button:not(:disabled), input, textarea, a[href]') || []);
    focusable()[0]?.focus();
    function handleKey(event: KeyboardEvent) {
      if (event.key === 'Escape' && !busy) { setReview(null); setBriefing(false); }
      if (event.key !== 'Tab') return;
      const nodes = focusable();
      const first = nodes[0], last = nodes[nodes.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
      if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
    }
    document.addEventListener('keydown', handleKey);
    return () => { document.removeEventListener('keydown', handleKey); previous?.focus(); };
  }, [modalOpen, busy]);
  const pending = data.drafts.filter(d => d.status === 'pending');
  async function run(action: () => Promise<{ error?: string; success?: string }>) {
    if (busy) return;
    setBusy(true); setMessage(null);
    try {
      const result = await action();
      setMessage({ text: result.error || result.success || 'Saved.', error: !!result.error });
      if (!result.error) { setReview(null); router.refresh(); }
    } catch { setMessage({ text: 'That action could not be saved. Please try again.', error: true }); }
    finally { setBusy(false); }
  }
  function prepare(id: string) { run(() => createJarvisDraft(id)); setTab('Approvals'); }
  const displayDonors = data.donors.filter(d => d.name.toLowerCase().includes(query.toLowerCase()));
  const actions = <div className={panel}>
    <div className="flex items-center justify-between border-b border-gray-100 p-5"><h2 className="font-bold">Commitments to move forward</h2><Link className="text-xs font-semibold text-evergreen" href="/tasks">All tasks →</Link></div>
    {data.tasks.slice(0, tab === 'Overview' ? 4 : 30).map(t => <div key={t.id} className="border-b border-gray-100 p-5 last:border-0">
      <div className="mb-2 flex flex-wrap gap-2 text-[10px] font-bold uppercase tracking-wider text-gray-500"><span>{t.priority} priority</span><span>· {date(t.dueDate)}</span></div>
      <Link href={`/tasks/${t.id}/edit`} className="font-semibold text-gray-900 hover:text-evergreen">{t.title}</Link>
      <p className="mt-1 text-xs text-gray-500">{t.donorName || 'Organization commitment'} · Owner: {t.owner}</p>
      <div className="mt-3 flex flex-wrap gap-2">{t.donorId ? <button className={button} disabled={busy} onClick={() => prepare(t.donorId!)}>Prepare outreach <ArrowUpRight size={13} /></button> : null}
        {t.canComplete ? <button className={button} disabled={busy} onClick={() => run(() => completeJarvisTask(t.id))}><Check size={13} />Complete</button> : null}</div>
    </div>)}
    {data.tasks.length === 0 ? <p className="p-8 text-center text-sm text-gray-500">No open commitments in this view. Add a task to track your next promise.</p> : null}
    {data.openTasks > data.tasks.length ? <p className="p-4 text-xs text-gray-500">Showing the first {data.tasks.length} of {data.openTasks}. Open All tasks for the full queue.</p> : null}
  </div>;
  const campaigns = <div className={panel}><div className="flex justify-between border-b border-gray-100 p-5"><h2 className="font-bold">Campaign pulse</h2><Link href="/campaigns" className="text-xs font-semibold text-evergreen">All campaigns →</Link></div>
    {data.campaigns.map(c => <Link key={c.id} href={`/campaigns/${c.id}`} className="block border-b border-gray-100 p-5 last:border-0 hover:bg-gray-50">
      <div className="flex justify-between gap-3"><strong className="text-sm">{c.name}</strong><span className="text-[10px] text-gray-500">{c.status}</span></div>
      <div className="my-3 h-1.5 overflow-hidden rounded bg-gray-100"><div className="h-full rounded bg-evergreen/60" style={{ width: `${c.goal && c.goal > 0 ? Math.min(100, Math.max(0, c.raised / c.goal * 100)) : 0}%` }} /></div>
      <div className="flex justify-between text-xs text-gray-500"><span>{money(c.raised)} recorded</span><span>{c.goal === null ? 'No goal set' : `${money(c.goal)} goal`}</span></div>
      <p className="mt-2 text-[11px] text-gray-400">Start: {date(c.startDate)}</p>
    </Link>)}
    {data.campaigns.length === 0 ? <p className="p-8 text-sm text-gray-500">No active or planning campaigns are visible to you.</p> : null}
    <p className="border-t border-gray-100 p-4 text-[11px] leading-relaxed text-gray-500">Up to 8 active or planning parent campaigns. Recorded totals come from Donor Success; verify pledge and cash treatment in the source records.</p>
  </div>;
  const donors = <div className={`${panel} overflow-x-auto`}><table className="w-full text-left text-sm"><thead><tr className="border-b border-gray-100 text-[10px] uppercase tracking-wider text-gray-500"><th className="p-4">Relationship</th><th className="p-4">Lifetime giving</th><th className="p-4">Risk / owner</th><th className="p-4">Next step</th></tr></thead><tbody>
    {displayDonors.map(d => <tr key={d.id} className="border-b border-gray-100 last:border-0"><td className="p-4"><Link className="font-semibold hover:text-evergreen" href={`/donors/${d.id}`}>{d.name}</Link></td><td className="p-4">{money(d.giving)}</td><td className="p-4"><span className="text-xs">{d.risk || 'Not scored'}</span><p className="text-xs text-gray-500">{d.owner}</p></td><td className="p-4"><button className={button} disabled={busy} onClick={() => prepare(d.id)}>Prepare outreach ↗</button></td></tr>)}
    {displayDonors.length === 0 ? <tr><td colSpan={4} className="p-8 text-center text-gray-500">No relationships in this list. Open Donors to search your full portfolio.</td></tr> : null}
  </tbody></table><p className="border-t border-gray-100 p-4 text-xs text-gray-500">Top 12 relationships by lifetime giving in the selected scope. <Link href={`/donors?scope=${data.scope}`} className="text-evergreen underline">Open the full donor list</Link>.</p></div>;
  return <div className="mx-auto max-w-7xl text-gray-900">
    <div className="flex flex-wrap items-start justify-between gap-4"><div><p className="text-[10px] font-bold uppercase tracking-[0.2em] text-evergreen">Donor Success · {data.organizationName}</p><h1 className="mt-3 text-3xl font-extrabold tracking-tight">Jarvis<span className="text-evergreen">.</span></h1><p className="mt-1 text-sm text-gray-600">Your Virtual Resource Development Officer</p></div><div className="flex flex-wrap gap-2"><button className={button} onClick={() => setBriefing(true)}>Portfolio briefing ↗</button><Link href="/insights?view=chat" className={primary}><Sparkles size={15} />Ask Jarvis</Link></div></div>
    <div className="mt-6 rounded-2xl border border-[#dce7d3] bg-[#e9efdf] p-6"><div className="flex flex-wrap items-center justify-between gap-4"><div><p className="text-[10px] font-bold uppercase tracking-widest text-evergreen">Your officer’s desk</p><h2 className="mt-2 text-xl font-bold">Good things start with follow-through.</h2><p className="mt-2 text-sm text-gray-600">Your real relationships, commitments, and campaigns. Ready for the next step.</p></div><button className={primary} onClick={() => setTab('Action queue')}>Review priorities →</button></div></div>
    <div className="mt-5 flex flex-wrap items-center justify-between gap-3"><div className="flex gap-2">{(['mine', 'all'] as const).map(s => <Link key={s} href={`/insights?scope=${s}`} className={`${button} ${data.scope === s ? '!border-evergreen !text-evergreen' : ''}`}>{s === 'mine' ? 'My portfolio' : 'Organization'}</Link>)}</div><p className="text-xs text-gray-500">Live app records · refreshed {date(data.refreshedAt)}</p></div>
    {message ? <div role={message.error ? 'alert' : 'status'} className={`mt-4 rounded-lg p-4 text-sm ${message.error ? 'bg-red-50 text-red-800' : 'bg-green-50 text-green-800'}`}>{message.text}</div> : null}
    {busy ? <div role="status" className="mt-3 flex items-center gap-2 text-xs text-gray-500"><Loader2 size={14} className="animate-spin" />Saving your work…</div> : null}
    <div className="my-5 grid grid-cols-2 gap-3 lg:grid-cols-4">{[
      ['Relationships in scope', String(data.totalDonors), data.scope === 'mine' ? 'Assigned to you' : 'Across your organization'],
      ['Open commitments', String(data.openTasks), 'Excludes outreach drafts'],
      ['Past due', String(data.overdueTasks), 'Due time has passed'],
      ['Your pending drafts', String(pending.length), 'Personal queue · latest 50 drafts'],
    ].map(([label,value,help]) => <div key={label} className={`${panel} p-5`}><p className="text-xs text-gray-500">{label}</p><strong className="my-2 block text-3xl font-extrabold">{value}</strong><p className="text-[11px] text-gray-500">{help}</p></div>)}</div>
    <nav aria-label="Officer workspace views" className="mb-6 flex gap-2 overflow-x-auto border-b border-gray-200 pb-3">{['Overview','My portfolio','Action queue','Campaigns','Approvals','Pilot setup'].map(t => <button key={t} className={`${button} whitespace-nowrap ${tab===t ? '!border-evergreen !bg-evergreen !text-white' : ''}`} aria-current={tab===t ? 'page' : undefined} onClick={() => setTab(t)}>{t}{t==='Approvals' ? ` (${pending.length})` : ''}</button>)}</nav>
    {tab === 'Overview' ? <><div className="grid items-start gap-5 xl:grid-cols-[1.5fr_1fr]">{actions}{campaigns}</div><h2 className="mb-4 mt-7 text-lg font-bold">Relationships at a glance</h2>{donors}</> : null}
    {tab === 'My portfolio' ? <><div className="mb-4 flex flex-wrap justify-between gap-3"><input aria-label="Filter displayed relationships" value={query} onChange={e => setQuery(e.target.value)} placeholder="Filter these relationships…" className="rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm" /><Link className={button} href={`/donors?scope=${data.scope}`}>Search full portfolio →</Link></div>{donors}</> : null}
    {tab === 'Action queue' ? <div className="space-y-5"><div className="flex justify-end"><Link href="/tasks/new" className={primary}>+ Track a commitment</Link></div>{actions}<div className={panel}><h2 className="border-b border-gray-100 p-5 font-bold">Relationships needing attention</h2>{data.risks.map(d => <div key={d.id} className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-100 p-5 last:border-0"><div><Link className="font-semibold text-evergreen" href={`/donors/${d.id}`}>{d.name}</Link><p className="mt-1 text-xs text-gray-500">Source: recorded retention risk is {d.risk.toLowerCase()}. Review the donor record before outreach.</p></div><button disabled={busy} className={button} onClick={() => prepare(d.id)}>Prepare check-in ↗</button></div>)}{!data.risks.length ? <p className="p-6 text-sm text-gray-500">No high or critical risk records found in this scope.</p> : null}</div></div> : null}
    {tab === 'Campaigns' ? campaigns : null}
    {tab === 'Approvals' ? <div className={panel}><div className="border-b border-gray-100 p-5"><h2 className="font-bold">A human touch. At every important step.</h2><p className="mt-2 text-xs text-gray-500">Drafts are stored in Donor Success. Approval does not send email. Copy approved text into your normal email workflow.</p></div>{data.drafts.map(d => <div key={d.id} className="flex flex-wrap items-center justify-between gap-4 border-b border-gray-100 p-5 last:border-0"><div><span className="text-[10px] font-bold uppercase tracking-wider text-evergreen">{d.status}</span><h3 className="mt-1 font-semibold">{d.donorName}</h3><p className="mt-1 text-sm text-gray-500">{d.subject}</p></div><button className={button} onClick={() => setReview({ ...d })}>{d.status==='pending' ? 'Review draft →' : 'View draft →'}</button></div>)}{!data.drafts.length ? <p className="p-8 text-center text-sm text-gray-500">Prepare outreach from a donor or an action to start your review queue.</p> : null}</div> : null}
    {tab === 'Pilot setup' ? <div className={`${panel} p-6`}><h2 className="text-lg font-bold">Ready for your organization’s pilot</h2><p className="mt-3 text-sm leading-7 text-gray-600">This workspace uses your signed-in Donor Success organization. It reads existing donors, tasks, campaigns, and risk fields. Drafts and approval decisions are stored as tasks with audit events. No sample donors are added.</p><div className="mt-5 flex flex-wrap gap-3"><Link className={button} href="/settings">Review CRM and email connections →</Link><Link className={button} href="/donors/import">Import donor records →</Link><Link className={button} href="/settings/import-team">Manage team →</Link></div><div className="mt-6 rounded-xl bg-amber-50 p-5 text-sm leading-7 text-amber-900">V1 uses rules and templates for the officer queue and outreach drafts. The existing Ask Jarvis AI chat is available separately. Inbox monitoring, automatic sending, campaign coordinator fields, and scheduled work are not part of this release. A saved CRM connection does not establish that its latest sync succeeded; verify current records in Settings.</div></div> : null}
    <p className="mt-6 text-[11px] text-gray-500">Jarvis V1 · Organization-scoped records · Staff review required · No automatic messages</p>
    {review ? <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"><section role="dialog" aria-modal="true" aria-labelledby="draft-title" className="max-h-[90vh] w-full max-w-2xl overflow-auto rounded-2xl bg-white p-6"><div className="flex items-center justify-between"><h2 id="draft-title" className="text-xl font-bold">{review.donorName}</h2><button aria-label="Close draft" className={button} disabled={busy} onClick={() => setReview(null)}><X size={16} /></button></div><p className="mt-2 text-xs text-gray-500">{review.email || 'No email address on file. Verify a recipient before manual sending.'}</p><p className="my-4 rounded-lg bg-gray-50 p-3 text-xs leading-6 text-gray-500">{review.source}</p><label className="block text-sm font-semibold">Subject<input className="mt-2 w-full rounded-lg border border-gray-200 p-3 font-normal" maxLength={250} readOnly={review.status!=='pending'} value={review.subject} onChange={e => setReview({ ...review, subject: e.target.value })} /></label><label className="mt-4 block text-sm font-semibold">Message<textarea className="mt-2 h-64 w-full rounded-lg border border-gray-200 p-3 text-sm font-normal leading-7" maxLength={12000} readOnly={review.status!=='pending'} value={review.body} onChange={e => setReview({ ...review, body: e.target.value })} /></label>{message?.error ? <p role="alert" className="mt-3 text-sm text-red-700">{message.text}</p> : null}<div className="mt-5 flex flex-wrap gap-2">{review.status==='pending' ? <>{(['save','reject','approve'] as const).map(decision => <button key={decision} disabled={busy} className={decision==='approve' ? primary : button} onClick={() => run(() => reviewJarvisDraft({ id: review.id, updatedAt: review.updatedAt, subject: review.subject, body: review.body, decision }))}>{decision==='approve' ? 'Approve for manual sending' : decision==='reject' ? 'Reject' : 'Save edits'}</button>)}</> : <button className={button} onClick={async () => { try { await navigator.clipboard.writeText(`Subject: ${review.subject}\n\n${review.body}`); setMessage({ text: 'Draft copied. No email was sent.', error: false }); } catch { setMessage({ text: 'Copy unavailable. Select and copy the message text manually.', error: true }); } }}>Copy text</button>}</div></section></div> : null}
    {briefing ? <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"><section role="dialog" aria-modal="true" aria-labelledby="brief-title" className="max-h-[85vh] w-full max-w-xl overflow-auto rounded-2xl bg-white p-6"><div className="flex justify-between gap-3"><h2 id="brief-title" className="text-xl font-bold">Your portfolio, in focus.</h2><button autoFocus className={button} aria-label="Close briefing" onClick={() => setBriefing(false)}><X size={16} /></button></div><p className="mt-4 text-sm leading-7">{data.totalDonors} relationships · {data.openTasks} open commitments · {data.overdueTasks} past due.</p><h3 className="mt-5 text-sm font-bold">Next commitments</h3>{data.tasks.slice(0,5).map(t => <p key={t.id} className="mt-3 border-t border-gray-100 pt-3 text-sm">{t.title}<span className="mt-1 block text-xs text-gray-500">{t.owner} · {date(t.dueDate)}</span></p>)}<p className="mt-5 text-xs leading-6 text-gray-500">Rule-based summary of current application records in your selected scope. This briefing does not infer new donor commitments.</p></section></div> : null}
  </div>;
}

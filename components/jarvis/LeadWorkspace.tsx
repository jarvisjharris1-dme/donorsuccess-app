'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { buildJarvisPipeline, saveJarvisLead } from '@/lib/actions/jarvis-leads';
import { emptyLead, rateLead, preserveApproval, LEAD_GOALS, LEAD_STAGES, QUALITY_LABELS } from '@/lib/jarvis-leads';
import type { Lead, LeadRow } from '@/lib/jarvis-leads';

const inputClass = 'mt-1.5 w-full rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm font-normal text-gray-900 disabled:bg-gray-50';
const button = 'inline-flex items-center justify-center rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50';
const primary = 'inline-flex items-center justify-center rounded-lg bg-evergreen px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#0d685f] disabled:opacity-50';
const panel = 'rounded-2xl border border-gray-200 bg-white';

type Props = { leads: LeadRow[]; organizationName: string; scope: 'mine' | 'all'; q: string; page: number; pages: number; total: number };
export default function LeadWorkspace({ leads, organizationName, scope, q, page, pages, total }: Props) {
  const router = useRouter();
  const [selected, setSelected] = useState<{ lead: Lead; id?: string; updatedAt?: string; canEdit: boolean } | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ text: string; error: boolean } | null>(null);
  const [view, setView] = useState<'list' | 'pipeline'>('pipeline');
  const [sort, setSort] = useState<'quality' | 'priority' | 'due'>('quality');
  const [stageFilter, setStageFilter] = useState('All stages');
  const [buildConfirm, setBuildConfirm] = useState(false);
  function href(p: number, s = scope) { const params = new URLSearchParams({ scope: s, page: String(p) }); if(q) params.set('q',q); return `/jarvis/leads?${params}`; }
  function open(lead: LeadRow) { setSelected({ lead: { ...lead }, id: lead.id, updatedAt: lead.updatedAt, canEdit: lead.canEdit }); setMessage(null); }
  function update<K extends keyof Lead>(key: K, value: Lead[K]) { if(selected) setSelected({ ...selected, lead: preserveApproval(selected.lead, { ...selected.lead, [key]: value }) }); }
  async function run(action: () => Promise<{ success?: string; error?: string }>) {
    if(busy) return; setBusy(true); setMessage(null);
    try { const result = await action(); setMessage({ text: result.error || result.success || 'Saved.', error: !!result.error });
      if(!result.error) { setSelected(null); setBuildConfirm(false); router.refresh(); } }
    catch { setMessage({ text: 'Could not save your work. Please try again.', error: true }); }
    finally { setBusy(false); }
  }
  const priorities = { HIGH: 3, MEDIUM: 2, LOW: 1 };
  const sorted = [...leads].filter(l => stageFilter === 'All stages' || l.stage === stageFilter).sort((a,b) => sort==='quality'
    ? rateLead(b).score-rateLead(a).score : sort==='priority' ? priorities[b.priority]-priorities[a.priority] : (a.dueDate||'9999').localeCompare(b.dueDate||'9999'));
  const rating = selected ? rateLead(selected.lead) : null;
  function leadCard(lead: LeadRow) {
    const quality = rateLead(lead);
    return <button key={lead.id} type="button" onClick={() => open(lead)} className="w-full rounded-xl border border-gray-200 bg-white p-4 text-left transition hover:border-evergreen hover:shadow-sm">
      <div className="flex items-center justify-between gap-2"><span className="text-[10px] font-bold uppercase tracking-wider text-gray-500">{lead.priority} priority</span><strong className="text-sm text-evergreen">{quality.score}/100</strong></div>
      <h3 className="mt-2 font-bold text-gray-900">{lead.name}</h3><p className="mt-1 text-xs text-gray-500">{lead.goal}</p>
      <p className="mt-3 text-xs font-semibold text-evergreen">{quality.grade}</p>
      <p className="mt-2 text-xs text-gray-500">{lead.contact || 'Contact to research'} · {lead.communicationStatus}</p>
      <p className="mt-3 text-xs leading-5 text-gray-600">Next: {lead.nextStep}</p><p className="mt-2 text-[11px] text-gray-500">Owner: {lead.owner}{lead.dueDate ? ` · Follow up ${lead.dueDate}` : ''}</p>
    </button>;
  }
  if(selected) return <div className="mx-auto max-w-5xl">
    <button disabled={busy} className={button} onClick={() => setSelected(null)}>← Back to leads & outreach</button>
    <div className="mb-6 mt-5"><p className="text-xs font-bold uppercase tracking-wider text-evergreen">Jarvis · {organizationName}</p><h1 className="mt-2 text-2xl font-extrabold">{selected.id ? selected.lead.name : 'Add a lead'}</h1><p className="mt-2 text-sm text-gray-500">Document the opportunity, assess the evidence, and review the proposed communication.</p></div>
    {message ? <p role={message.error?'alert':'status'} className={`mb-5 rounded-lg p-4 text-sm ${message.error?'bg-red-50 text-red-800':'bg-green-50 text-green-800'}`}>{message.text}</p> : null}
    {!selected.canEdit ? <p className="mb-4 text-sm text-gray-500">Read-only: the lead owner or an administrator can edit this record.</p> : null}
    <form onSubmit={e => { e.preventDefault(); run(() => saveJarvisLead({ id:selected.id, updatedAt:selected.updatedAt, lead:selected.lead, decision:'save' })); }}>
      <fieldset disabled={busy || !selected.canEdit} className="space-y-5">
        <section className={`${panel} p-5`}><h2 className="mb-4 font-bold">The relationship</h2><div className="grid gap-4 sm:grid-cols-2">
          <label className="text-xs font-semibold">Lead / organization name<input required maxLength={160} className={inputClass} value={selected.lead.name} onChange={e=>update('name',e.target.value)} /></label>
          <label className="text-xs font-semibold">Target contact<input maxLength={120} className={inputClass} value={selected.lead.contact} onChange={e=>update('contact',e.target.value)} /></label>
          <label className="text-xs font-semibold">Contact email<input type="email" maxLength={254} className={inputClass} value={selected.lead.email} onChange={e=>update('email',e.target.value)} /></label>
          <label className="text-xs font-semibold">Outreach purpose<select className={inputClass} value={selected.lead.goal} onChange={e=>update('goal',e.target.value as Lead['goal'])}>{LEAD_GOALS.map(g=><option key={g}>{g}</option>)}</select></label>
          <label className="text-xs font-semibold sm:col-span-2">Why this lead is a fit<textarea required maxLength={2000} className={inputClass} value={selected.lead.rationale} onChange={e=>update('rationale',e.target.value)} /></label>
          <label className="text-xs font-semibold sm:col-span-2">Source / referral / research reference<textarea required maxLength={1500} className={inputClass} value={selected.lead.source} onChange={e=>update('source',e.target.value)} /></label>
        </div>{selected.lead.donorId ? <Link className="mt-3 inline-block text-xs font-semibold text-evergreen underline" href={`/donors/${selected.lead.donorId}`}>Open source donor record →</Link> : null}</section>
        <section className={`${panel} p-5`}><div className="flex flex-wrap items-center justify-between gap-3"><h2 className="font-bold">Lead quality</h2><span className="rounded-full bg-evergreen/10 px-3 py-1 text-sm font-bold text-evergreen">{rating?.score}/100 · {rating?.grade}</span></div><p className="mt-3 text-xs leading-6 text-gray-500">An evidence-based qualification rubric, not a prediction of giving or a wealth estimate. Missing information stays unknown. Staff-entered ratings require supporting evidence.</p><div className="mt-4 grid gap-4 sm:grid-cols-2">
          {(['fit','relationship','capacity','timing'] as const).map(key=><label key={key} className="text-xs font-semibold">{key==='fit'?'Mission fit':key==='capacity'?'Giving evidence':key==='relationship'?'Relationship strength':'Timing'}<select className={inputClass} value={selected.lead[key]} onChange={e=>update(key,e.target.value as never)}>{Object.entries(QUALITY_LABELS[key]).map(([value,label])=><option key={value} value={value}>{label}</option>)}</select></label>)}
          <label className="text-xs font-semibold sm:col-span-2">Evidence supporting these ratings<textarea maxLength={2000} className={inputClass} placeholder="What is known, where it came from, and when it was verified" value={selected.lead.qualityEvidence} onChange={e=>update('qualityEvidence',e.target.value)} /></label>
        </div><div className="mt-4 space-y-2">{rating?.factors.map(f=><div key={f.name} className="flex justify-between gap-4 border-t border-gray-100 pt-2 text-xs"><span>{f.name}<span className="mt-1 block text-gray-500">{f.reason}</span></span><strong>{f.points}/{f.max}</strong></div>)}</div>{rating?.missing.length ? <p className="mt-4 text-xs text-amber-800">Still to qualify: {rating.missing.join(', ')}.</p> : null}</section>
        <section className={`${panel} p-5`}><h2 className="mb-4 font-bold">Pipeline & next step</h2><div className="grid gap-4 sm:grid-cols-3">
          <label className="text-xs font-semibold">Stage<select className={inputClass} value={selected.lead.stage} onChange={e=>update('stage',e.target.value as Lead['stage'])}>{LEAD_STAGES.map(s=><option key={s}>{s}</option>)}</select></label>
          <label className="text-xs font-semibold">Priority<select className={inputClass} value={selected.lead.priority} onChange={e=>update('priority',e.target.value as Lead['priority'])}>{['HIGH','MEDIUM','LOW'].map(s=><option key={s}>{s}</option>)}</select></label>
          <label className="text-xs font-semibold">Follow-up date<input type="date" className={inputClass} value={selected.lead.dueDate} onChange={e=>update('dueDate',e.target.value)} /></label>
          <label className="text-xs font-semibold sm:col-span-3">Next step<input required maxLength={500} className={inputClass} value={selected.lead.nextStep} onChange={e=>update('nextStep',e.target.value)} /></label>
        </div><p className="mt-3 text-xs text-gray-500">Stages reflect staff-recorded progress. Choosing Contacted does not send a message or log an email interaction.</p></section>
        <section className={`${panel} p-5`}><div className="flex flex-wrap items-center justify-between gap-3"><h2 className="font-bold">Proposed targeted communication</h2><button type="button" className={button} onClick={()=>run(()=>saveJarvisLead({ id:selected.id, updatedAt:selected.updatedAt, lead:selected.lead, decision:'prepare' }))}>Save & propose message</button></div><p className="mt-3 text-xs leading-6 text-gray-500">Purpose-specific template for this lead. Use the research and rationale above to personalize it. Preparing a new proposal replaces the current text and clears its approval.</p>
          <label className="mt-4 block text-xs font-semibold">Subject<input maxLength={250} className={inputClass} value={selected.lead.subject} onChange={e=>update('subject',e.target.value)} /></label>
          <label className="mt-4 block text-xs font-semibold">Proposed message<textarea maxLength={12000} className={`${inputClass} min-h-72 leading-7`} value={selected.lead.body} onChange={e=>update('body',e.target.value)} /></label>
          <p className="mt-3 text-xs text-gray-500">Saved status: {selected.lead.communicationStatus}{selected.lead.approvedAt?` · Approved ${selected.lead.approvedAt.slice(0,10)}`:''}. Changes to the recipient, message, or targeting require review again.</p>
          <button type="button" className={`${primary} mt-4`} onClick={()=>run(()=>saveJarvisLead({ id:selected.id, updatedAt:selected.updatedAt, lead:selected.lead, decision:'approve' }))}>Save & approve for manual sending</button>
        </section>
        <div className="flex flex-wrap gap-3"><button className={primary} type="submit">{busy?'Saving…':'Save lead & next step'}</button></div>
      </fieldset>
    </form>
    {selected.lead.communicationStatus==='approved'?<button className={`${button} mt-5`} onClick={async()=>{try{await navigator.clipboard.writeText(`Subject: ${selected.lead.subject}\n\n${selected.lead.body}`);setMessage({text:'Message copied. Verify the recipient in your normal email workflow; nothing was sent.',error:false});}catch{setMessage({text:'Select and copy the message text manually.',error:true});}}}>Copy saved approved message</button>:null}
  </div>;
  return <div className="mx-auto max-w-7xl">
    <Link href="/insights" className="text-sm font-semibold text-evergreen">← Jarvis officer workspace</Link>
    <div className="mt-5 flex flex-wrap items-start justify-between gap-4"><div><p className="text-[10px] font-bold uppercase tracking-widest text-evergreen">Jarvis · {organizationName}</p><h1 className="mt-2 text-3xl font-extrabold tracking-tight">A pipeline with a next step.</h1><p className="mt-2 text-sm text-gray-500">Working leads, transparent quality ratings, and proposed communications.</p></div><div className="flex flex-wrap gap-2"><button className={button} disabled={busy} onClick={()=>setBuildConfirm(!buildConfirm)}>Build my pipeline ✦</button><button className={primary} onClick={()=>{setSelected({lead:emptyLead(),canEdit:true});setMessage(null);}}>+ Add lead</button></div></div>
    {message?<p role={message.error?'alert':'status'} className={`mt-5 rounded-lg p-4 text-sm ${message.error?'bg-red-50 text-red-800':'bg-green-50 text-green-800'}`}>{message.text}</p>:null}
    {buildConfirm?<div className="mt-5 rounded-xl border border-[#dce7d3] bg-[#e9efdf] p-5"><h2 className="font-bold">Build a proposed pipeline from CRM records</h2><p className="mt-2 text-sm leading-7 text-gray-600">Jarvis reviews up to 50 {scope==='mine'?'assigned':'organization'} donor records by lifetime giving, adds new leads to your personal pipeline, and proposes an outreach message for each. Existing personal leads are preserved. Ratings show the recorded evidence and unknowns. This does not discover new prospects on the web or send messages.</p><button className={`${primary} mt-3`} disabled={busy} onClick={()=>run(()=>buildJarvisPipeline(scope))}>{busy?'Building pipeline…':'Build leads & proposed messages'}</button></div>:null}
    <div className="mt-5 flex flex-wrap items-center justify-between gap-3"><div className="flex gap-2">{(['mine','all'] as const).map(s=><Link key={s} className={`${button} ${scope===s?'!border-evergreen !text-evergreen':''}`} href={href(1,s)}>{s==='mine'?'My working list':'Organization'}</Link>)}</div><span className="text-xs text-gray-500">{total} saved leads · Page {page} of {pages}</span></div>
    <div className="my-5 flex flex-wrap items-center justify-between gap-3"><form method="get" action="/jarvis/leads" className="flex gap-2"><input type="hidden" name="scope" value={scope}/><input aria-label="Search lead names" name="q" defaultValue={q} placeholder="Search all lead names…" className="rounded-lg border border-gray-200 px-3 py-2 text-sm"/><button className={button}>Search</button></form><div className="flex flex-wrap gap-2"><select aria-label="Filter stages on this page" className="rounded-lg border border-gray-200 p-2 text-xs" value={stageFilter} onChange={e=>setStageFilter(e.target.value)}><option>All stages</option>{LEAD_STAGES.map(s=><option key={s}>{s}</option>)}</select><select aria-label="Sort current page" className="rounded-lg border border-gray-200 p-2 text-xs" value={sort} onChange={e=>setSort(e.target.value as typeof sort)}><option value="quality">Quality: highest first</option><option value="priority">Priority</option><option value="due">Follow-up date</option></select><button className={button} onClick={()=>setView(view==='list'?'pipeline':'list')}>{view==='list'?'Pipeline view':'List view'}</button></div></div>
    <p className="mb-4 text-xs text-gray-500">Stages, scores, and sorting below apply to this page of up to 25 recently updated leads. Search and pagination cover the full working list.</p>
    {!sorted.length?<div className={`${panel} p-10 text-center`}><h2 className="font-bold">Give Jarvis a starting point.</h2><p className="mt-2 text-sm text-gray-500">Build a pipeline from your CRM or add a researched lead. No matching leads are displayed on this page.</p></div>:view==='list'?<div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{sorted.map(leadCard)}</div>:<div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-4">{LEAD_STAGES.filter(s=>sorted.some(l=>l.stage===s)).map(stage=><section key={stage} className="rounded-2xl bg-gray-100 p-3"><h2 className="mb-3 flex justify-between px-1 text-sm font-bold">{stage}<span className="text-gray-500">{sorted.filter(l=>l.stage===stage).length}</span></h2><div className="space-y-3">{sorted.filter(l=>l.stage===stage).map(leadCard)}</div></section>)}</div>}
    <div className="mt-6 flex justify-between"><Link aria-disabled={page<=1} className={`${button} ${page<=1?'pointer-events-none opacity-40':''}`} href={href(Math.max(1,page-1))}>← Previous</Link><Link aria-disabled={page>=pages} className={`${button} ${page>=pages?'pointer-events-none opacity-40':''}`} href={href(Math.min(pages,page+1))}>Next →</Link></div>
    <p className="mt-6 text-xs leading-6 text-gray-500">Lead quality rubric: fit 30 · relationship 20 · giving evidence 20 · contact readiness 15 · timing 15. Unknowns are unverified, not proof of a poor prospect. Approval never sends a message. Lead communication review lives here; donor drafts remain in the officer workspace’s Approvals tab.</p>
  </div>;
}

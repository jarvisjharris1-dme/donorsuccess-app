'use client';

import { useState } from 'react';

export default function TurboDocxWebhookSetup() {
  const [loading, setLoading] = useState(false);
  const [testing, setTesting] = useState(false);
  const [org, setOrg] = useState('OMG Tennis');
  const [quoteId, setQuoteId] = useState('');
  const [eventType, setEventType] = useState('signature.document.completed');
  const [result, setResult] = useState<any>(null);
  const [testResult, setTestResult] = useState<any>(null);

  async function register() {
    if (!window.confirm('Register the Donor Success TurboSign webhook now? TurboDocx will show the signing secret only once.')) return;
    setLoading(true); setResult(null);
    try {
      const res = await fetch('/api/admin/turbodocx/register-webhook', { method: 'POST' });
      const data = await res.json();
      setResult(res.ok ? data : { error: data.error || 'Registration failed.' });
    } catch { setResult({ error: 'Registration failed.' }); }
    finally { setLoading(false); }
  }

  async function testWebhook() {
    if (!org.trim()) return;
    setTesting(true); setTestResult(null);
    try {
      const res = await fetch('/api/admin/turbodocx/test-webhook', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ organizationName: org, quoteId, eventType }),
      });
      const data = await res.json();
      setTestResult(res.ok ? data : { error: data.error || 'Webhook test failed.' });
    } catch { setTestResult({ error: 'Webhook test failed.' }); }
    finally { setTesting(false); }
  }

  return (
    <section className="rounded-2xl border border-gray-700 bg-gray-800/70 p-6 space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div><h2 className="text-lg font-extrabold text-white">TurboSign Webhook</h2><p className="mt-1 max-w-2xl text-sm text-gray-400">TurboDocx signature events feed the Donor Success fulfillment queue automatically.</p></div>
        <button onClick={register} disabled={loading} className="rounded-xl bg-evergreen px-5 py-3 text-sm font-bold text-white disabled:opacity-60">{loading ? 'Registering…' : 'Register Webhook'}</button>
      </div>
      {result?.error && <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-300">{result.error}</div>}
      {result?.secret && <div className="space-y-3 rounded-xl border border-amber-500/30 bg-amber-500/10 p-5"><p className="font-bold text-amber-300">Copy this secret now — it will not be available again.</p><div className="break-all rounded-lg bg-gray-950 p-3 font-mono text-sm text-white">{result.secret}</div><button onClick={() => navigator.clipboard.writeText(result.secret || '')} className="rounded-lg border border-gray-600 px-4 py-2 text-sm font-semibold text-white">Copy Secret</button></div>}

      <div className="border-t border-gray-700 pt-6">
        <div className="mb-4"><h3 className="font-extrabold text-white">Webhook Diagnostic Test</h3><p className="mt-1 text-sm text-gray-400">Sends a real signed test delivery from TurboDocx to this app. Use a pending order name so we can verify auto-matching.</p></div>
        <div className="grid gap-3 md:grid-cols-4">
          <input value={org} onChange={e => setOrg(e.target.value)} placeholder="Organization name" className="rounded-xl border border-gray-700 bg-gray-950 px-4 py-3 text-sm text-white" />
          <input value={quoteId} onChange={e => setQuoteId(e.target.value)} placeholder="TurboQuote ID (optional)" className="rounded-xl border border-gray-700 bg-gray-950 px-4 py-3 text-sm text-white" />
          <select value={eventType} onChange={e => setEventType(e.target.value)} className="rounded-xl border border-gray-700 bg-gray-950 px-4 py-3 text-sm text-white"><option value="signature.document.completed">Completed</option><option value="signature.document.voided">Voided</option></select>
          <button onClick={testWebhook} disabled={testing || !org.trim()} className="rounded-xl bg-teal px-5 py-3 text-sm font-extrabold text-gray-950 disabled:opacity-60">{testing ? 'Testing…' : 'Test Webhook'}</button>
        </div>
        {testResult?.error && <div className="mt-4 rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-300">{testResult.error}</div>}
        {testResult?.success && <div className={`mt-4 rounded-xl border p-4 text-sm ${testResult.summary?.failed ? 'border-amber-500/30 bg-amber-500/10 text-amber-200' : 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300'}`}><div className="font-extrabold">{testResult.summary?.failed ? 'Test delivered with errors' : 'Webhook delivery successful'}</div><div className="mt-2 text-xs opacity-80">Total: {testResult.summary?.total ?? '—'} · Successful: {testResult.summary?.successful ?? '—'} · Failed: {testResult.summary?.failed ?? '—'}</div><div className="mt-1 break-all text-xs opacity-70">Test document: {testResult.testDocumentId}</div>{testResult.summary?.errors?.length > 0 && <div className="mt-2">{testResult.summary.errors.join(' · ')}</div>}</div>}
      </div>
    </section>
  );
}

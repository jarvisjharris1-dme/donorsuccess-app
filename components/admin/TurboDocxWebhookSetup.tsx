'use client';

import { useState } from 'react';

export default function TurboDocxWebhookSetup() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ webhookId?: string; secret?: string; webhookUrl?: string; error?: string } | null>(null);

  async function register() {
    if (!window.confirm('Register the Donor Success TurboSign webhook now? TurboDocx will show the signing secret only once.')) return;
    setLoading(true);
    setResult(null);
    try {
      const res = await fetch('/api/admin/turbodocx/register-webhook', { method: 'POST' });
      const data = await res.json();
      if (!res.ok) setResult({ error: data.error || 'Registration failed.' });
      else setResult(data);
    } catch {
      setResult({ error: 'Registration failed.' });
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="rounded-2xl border border-gray-700 bg-gray-800/70 p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-extrabold text-white">TurboSign Webhook</h2>
          <p className="mt-1 max-w-2xl text-sm text-gray-400">Register TurboDocx programmatically for completed and voided signature events. The signing secret is shown once and should be copied directly into Vercel as TURBODOCX_WEBHOOK_SECRET.</p>
        </div>
        <button onClick={register} disabled={loading} className="rounded-xl bg-evergreen px-5 py-3 text-sm font-bold text-white hover:bg-[#0d685f] disabled:opacity-60">
          {loading ? 'Registering…' : 'Register Webhook'}
        </button>
      </div>

      {result?.error && <div className="mt-5 rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-300">{result.error}</div>}
      {result?.secret && (
        <div className="mt-5 space-y-3 rounded-xl border border-amber-500/30 bg-amber-500/10 p-5">
          <p className="font-bold text-amber-300">Copy this secret now — it will not be available again.</p>
          <div className="break-all rounded-lg bg-gray-950 p-3 font-mono text-sm text-white">{result.secret}</div>
          <button onClick={() => navigator.clipboard.writeText(result.secret || '')} className="rounded-lg border border-gray-600 px-4 py-2 text-sm font-semibold text-white hover:bg-gray-700">Copy Secret</button>
          <div className="text-xs text-gray-400">Webhook ID: {result.webhookId || '—'}<br />Endpoint: {result.webhookUrl || '—'}</div>
        </div>
      )}
    </section>
  );
}

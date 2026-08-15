'use client';

import { useState, useTransition } from 'react';
import { Gem } from 'lucide-react';
import {
  connectWealthEngineAction,
  disconnectWealthEngineAction,
  type ActionState,
} from '@/lib/actions/wealth-engine';

export default function WealthEngineConnectionSection({
  isConnected,
  baseUrl,
  canManage,
}: {
  isConnected: boolean;
  baseUrl: string | null;
  canManage: boolean;
}) {
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleConnect(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    setError(null);
    setSuccess(null);
    startTransition(async () => {
      const result: ActionState = await connectWealthEngineAction(undefined, formData);
      if (result?.error) setError(result.error);
      else setSuccess('Connected.');
    });
  }

  function handleDisconnect() {
    if (!confirm('Disconnect WealthEngine? Previously-screened donor data stays on their records.')) {
      return;
    }
    startTransition(async () => {
      const result: ActionState = await disconnectWealthEngineAction(undefined, new FormData());
      if (result?.error) setError(result.error);
    });
  }

  const inputClasses =
    'w-full rounded-[10px] border border-gray-200 px-3.5 py-3 text-sm focus:border-teal focus:outline-none focus:ring-2 focus:ring-teal/20';

  return (
    <div className="rounded-[16px] border border-gray-200 bg-white p-6">
      <div className="flex items-center gap-2">
        <Gem size={16} className="text-gray-900" />
        <h2 className="text-[15px] font-bold text-gray-900">WealthEngine</h2>
      </div>
      <p className="mt-1 text-sm text-gray-600">
        Wealth screening from Altrata/WealthEngine — estimated net worth, giving capacity, and
        Propensity to Give score. Access is purchased directly through their sales team, not a
        self-serve signup; each screen has a real per-profile cost, so screening always happens
        one donor at a time, on demand.
      </p>

      {error && (
        <p className="mt-3 rounded-lg bg-red-50 px-3.5 py-2.5 text-sm font-medium text-red-600">{error}</p>
      )}
      {success && (
        <p className="mt-3 rounded-lg bg-success/10 px-3.5 py-2.5 text-sm font-medium text-success">
          {success}
        </p>
      )}

      {!canManage ? (
        <p className="mt-4 text-sm text-gray-600">Ask an Admin to connect WealthEngine.</p>
      ) : isConnected ? (
        <div className="mt-4 flex items-center justify-between rounded-xl border border-gray-100 bg-gray-50 p-4">
          <div>
            <div className="text-sm font-semibold text-gray-900">Connected</div>
            <div className="text-xs text-gray-600">{baseUrl}</div>
          </div>
          <button
            type="button"
            onClick={handleDisconnect}
            disabled={isPending}
            className="text-[12.5px] font-semibold text-gray-600 transition-colors hover:text-error disabled:opacity-60"
          >
            {isPending ? 'Disconnecting…' : 'Disconnect'}
          </button>
        </div>
      ) : (
        <form onSubmit={handleConnect} className="mt-4 flex flex-col gap-3">
          <div>
            <label htmlFor="apiKey" className="mb-1.5 block text-[13px] font-semibold text-gray-900">
              API key
            </label>
            <input id="apiKey" name="apiKey" type="password" required className={inputClasses} />
          </div>
          <div>
            <label htmlFor="baseUrl" className="mb-1.5 block text-[13px] font-semibold text-gray-900">
              API base URL (optional)
            </label>
            <input
              id="baseUrl"
              name="baseUrl"
              type="text"
              placeholder="https://api.wealthengine.com"
              className={inputClasses}
            />
            <p className="mt-1 text-xs text-gray-600">
              Leave blank unless WealthEngine gave you a different endpoint for your account
              (e.g. a sandbox URL).
            </p>
          </div>
          <button
            type="submit"
            disabled={isPending}
            className="mt-1 self-start rounded-xl bg-evergreen px-5 py-3 text-[14px] font-semibold text-white transition-colors hover:bg-[#0d685f] disabled:opacity-60"
          >
            {isPending ? 'Verifying…' : 'Connect'}
          </button>
        </form>
      )}
    </div>
  );
}

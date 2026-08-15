'use client';

import { useState, useTransition } from 'react';
import { RefreshCw } from 'lucide-react';
import { syncSalesforceNowAction, type SyncActionState } from '@/lib/actions/salesforce';

export default function SyncSalesforceButton() {
  const [state, setState] = useState<SyncActionState>(undefined);
  const [isPending, startTransition] = useTransition();

  function handleClick() {
    setState(undefined);
    startTransition(async () => {
      const result = await syncSalesforceNowAction(undefined, new FormData());
      setState(result);
    });
  }

  return (
    <div>
      <button
        type="button"
        onClick={handleClick}
        disabled={isPending}
        className="flex items-center gap-2 rounded-xl border border-gray-200 px-4 py-2.5 text-[13.5px] font-semibold text-gray-900 transition-colors hover:border-gray-300 disabled:opacity-60"
      >
        <RefreshCw size={15} className={isPending ? 'animate-spin' : ''} />
        {isPending ? 'Syncing…' : 'Sync Now'}
      </button>

      {state?.error && <p className="mt-2 text-xs font-medium text-error">{state.error}</p>}
      {state?.result && (
        <div className="mt-3 rounded-lg bg-success/10 px-3.5 py-2.5 text-sm text-gray-900">
          <p className="font-semibold text-success">Sync complete</p>
          <p className="mt-1 text-xs text-gray-600">
            {state.result.donorsCreated} donor{state.result.donorsCreated === 1 ? '' : 's'} created,{' '}
            {state.result.donorsUpdated} updated &middot; {state.result.opportunitiesCreated} opportunit
            {state.result.opportunitiesCreated === 1 ? 'y' : 'ies'} created,{' '}
            {state.result.opportunitiesUpdated} updated &middot; {state.result.giftsCreated} gift
            {state.result.giftsCreated === 1 ? '' : 's'} logged
          </p>
          {state.result.skipped.length > 0 && (
            <details className="mt-2 text-xs text-gray-600">
              <summary className="cursor-pointer font-semibold">
                {state.result.skipped.length} record{state.result.skipped.length === 1 ? '' : 's'} skipped
              </summary>
              <ul className="mt-1.5 flex flex-col gap-1">
                {state.result.skipped.map((s, i) => (
                  <li key={i}>
                    {s.record} — {s.reason}
                  </li>
                ))}
              </ul>
            </details>
          )}
        </div>
      )}
    </div>
  );
}

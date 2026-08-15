'use client';

import { useState, useTransition } from 'react';
import { RotateCcw } from 'lucide-react';
import { resyncSalesforceAction, type ActionState } from '@/lib/actions/salesforce';

export default function ResyncSalesforceButton() {
  const [state, setState] = useState<ActionState>(undefined);
  const [isPending, startTransition] = useTransition();

  function handleClick() {
    if (!confirm('Reset the sync bookmark so the next sync pulls everything fresh from Salesforce? Nothing is deleted.')) return;
    setState(undefined);
    startTransition(async () => {
      const result = await resyncSalesforceAction(undefined, new FormData());
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
        <RotateCcw size={15} className={isPending ? 'animate-spin' : ''} />
        {isPending ? 'Resetting…' : 'Resync'}
      </button>
      <p className="mt-1.5 text-xs text-gray-500">
        Resets the sync bookmark only &mdash; nothing is deleted. The next sync re-pulls everything from
        Salesforce into what&rsquo;s already here.
      </p>
      {state?.error && <p className="mt-2 text-xs font-medium text-error">{state.error}</p>}
      {state?.success && <p className="mt-2 text-xs font-medium text-success">{state.success}</p>}
    </div>
  );
}

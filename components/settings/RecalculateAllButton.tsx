'use client';

import { useState, useTransition } from 'react';
import { RefreshCw } from 'lucide-react';
import { recalculateAllScoresAction, type ActionState } from '@/lib/actions/scoring';

export default function RecalculateAllButton() {
  const [message, setMessage] = useState<{ type: 'error' | 'success'; text: string } | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleClick() {
    setMessage(null);
    startTransition(async () => {
      const result: ActionState = await recalculateAllScoresAction(undefined, new FormData());
      if (result?.error) setMessage({ type: 'error', text: result.error });
      else if (result?.success) setMessage({ type: 'success', text: result.success });
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
        {isPending ? 'Recalculating…' : 'Recalculate all donor scores'}
      </button>
      {message && (
        <p
          className={`mt-2 text-xs font-medium ${message.type === 'error' ? 'text-red-600' : 'text-success'}`}
        >
          {message.text}
        </p>
      )}
    </div>
  );
}

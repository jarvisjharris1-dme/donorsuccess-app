'use client';

import { useState, useTransition } from 'react';
import { Sparkles } from 'lucide-react';
import { loadStarterContentAction, type ActionState } from '@/lib/actions/starter-content';

export default function LoadStarterContentButton() {
  const [message, setMessage] = useState<string | null>(null);
  const [isError, setIsError] = useState(false);
  const [isPending, startTransition] = useTransition();

  function handleClick() {
    setMessage(null);
    startTransition(async () => {
      const result: ActionState = await loadStarterContentAction(undefined, new FormData());
      if (result?.error) {
        setIsError(true);
        setMessage(result.error);
      } else {
        setIsError(false);
        setMessage(result?.success ?? null);
      }
    });
  }

  return (
    <div>
      <button
        type="button"
        onClick={handleClick}
        disabled={isPending}
        className="flex items-center gap-1.5 rounded-xl border border-gray-200 px-4 py-2.5 text-[13.5px] font-semibold text-gray-900 transition-colors hover:border-gray-300 disabled:opacity-60"
      >
        <Sparkles size={14} />
        {isPending ? 'Loading…' : 'Load starter content'}
      </button>
      {message && (
        <p className={`mt-2 text-xs font-medium ${isError ? 'text-error' : 'text-success'}`}>{message}</p>
      )}
    </div>
  );
}

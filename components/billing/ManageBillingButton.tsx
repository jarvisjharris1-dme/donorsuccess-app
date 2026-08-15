'use client';

import { useState, useTransition } from 'react';
import { createBillingPortalSessionAction, type ActionState } from '@/lib/actions/billing';

export default function ManageBillingButton({ className }: { className?: string }) {
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleClick() {
    setError(null);
    startTransition(async () => {
      const result: ActionState = await createBillingPortalSessionAction(undefined, new FormData());
      if (result?.error) setError(result.error);
    });
  }

  return (
    <div>
      <button
        type="button"
        onClick={handleClick}
        disabled={isPending}
        className={
          className ??
          'rounded-xl bg-evergreen px-5 py-3 text-[14px] font-semibold text-white transition-colors hover:bg-[#0d685f] disabled:opacity-60'
        }
      >
        {isPending ? 'Opening…' : 'Manage billing'}
      </button>
      {error && <p className="mt-2 text-xs font-medium text-error">{error}</p>}
    </div>
  );
}

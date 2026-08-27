'use client';

import { useState, useTransition } from 'react';
import { submitGranteeApplicationAction } from '@/lib/actions/grantee-applications';

export default function SubmitApplicationButton({ applicationId }: { applicationId: string }) {
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleClick() {
    setError(null);
    startTransition(async () => {
      const result = await submitGranteeApplicationAction(applicationId);
      if (result?.error) setError(result.error);
    });
  }

  return (
    <div className="flex flex-col items-end gap-1.5">
      <button
        onClick={handleClick}
        disabled={isPending}
        className="rounded-xl bg-evergreen px-5 py-2.5 text-[13px] font-semibold text-white transition-all hover:-translate-y-0.5 hover:bg-[#0d685f] disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isPending ? 'Submitting…' : 'Submit application'}
      </button>
      {error && <p className="text-[12px] font-medium text-red-600">{error}</p>}
    </div>
  );
}

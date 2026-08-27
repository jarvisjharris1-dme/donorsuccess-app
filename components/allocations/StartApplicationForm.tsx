'use client';

import { useState, useTransition } from 'react';
import { createGranteeApplicationAction } from '@/lib/actions/grantee-applications';

export default function StartApplicationForm({
  fundingRoundId,
  grantees,
}: {
  fundingRoundId: string;
  grantees: { id: string; legalName: string }[];
}) {
  const [granteeId, setGranteeId] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!granteeId) {
      setError('Select a grantee first.');
      return;
    }
    setError(null);
    startTransition(async () => {
      const result = await createGranteeApplicationAction(fundingRoundId, granteeId);
      if (result?.error) setError(result.error);
    });
  }

  if (grantees.length === 0) {
    return (
      <p className="text-[13px] text-gray-600">
        No grantees yet.{' '}
        <a href="/grantees/new" className="font-semibold text-evergreen">
          Add one first →
        </a>
      </p>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex items-center gap-2">
      <select
        value={granteeId}
        onChange={(e) => setGranteeId(e.target.value)}
        className="flex-1 rounded-[10px] border border-gray-200 px-3.5 py-2.5 text-sm focus:border-teal focus:outline-none focus:ring-2 focus:ring-teal/20"
      >
        <option value="">Select a grantee</option>
        {grantees.map((g) => (
          <option key={g.id} value={g.id}>
            {g.legalName}
          </option>
        ))}
      </select>
      <button
        type="submit"
        disabled={isPending}
        className="flex-shrink-0 rounded-xl bg-evergreen px-4 py-2.5 text-[13px] font-semibold text-white transition-all hover:-translate-y-0.5 hover:bg-[#0d685f] disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isPending ? 'Starting…' : 'Start application'}
      </button>
      {error && <p className="text-[13px] font-medium text-red-600">{error}</p>}
    </form>
  );
}

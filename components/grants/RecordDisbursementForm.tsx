'use client';

import { useState, useTransition } from 'react';
import { Plus } from 'lucide-react';
import { recordGrantDisbursementAction, type ActionState } from '@/lib/actions/grants';

export default function RecordDisbursementForm({
  grantId,
  grantOpportunityId,
}: {
  grantId: string;
  grantOpportunityId: string;
}) {
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    formData.set('grantId', grantId);
    formData.set('grantOpportunityId', grantOpportunityId);
    setError(null);
    startTransition(async () => {
      const result: ActionState = await recordGrantDisbursementAction(undefined, formData);
      if (result?.error) setError(result.error);
      else setShowForm(false);
    });
  }

  if (!showForm) {
    return (
      <button
        type="button"
        onClick={() => setShowForm(true)}
        className="flex items-center gap-1.5 text-[13px] font-semibold text-evergreen hover:text-[#0d685f]"
      >
        <Plus size={14} />
        Record a disbursement
      </button>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-2.5 rounded-xl bg-gray-50 p-4">
      <div className="grid grid-cols-2 gap-2.5">
        <input
          name="amount"
          type="number"
          min="0"
          step="0.01"
          required
          placeholder="Amount"
          className="rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-teal focus:outline-none focus:ring-2 focus:ring-teal/20"
        />
        <input
          name="date"
          type="date"
          required
          className="rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-teal focus:outline-none focus:ring-2 focus:ring-teal/20"
        />
      </div>
      <input
        name="notes"
        placeholder="Notes (optional)"
        className="rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-teal focus:outline-none focus:ring-2 focus:ring-teal/20"
      />
      {error && <p className="text-xs font-medium text-error">{error}</p>}
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={isPending}
          className="rounded-lg bg-evergreen px-3.5 py-2 text-[13px] font-semibold text-white disabled:opacity-60"
        >
          {isPending ? 'Recording…' : 'Record'}
        </button>
        <button
          type="button"
          onClick={() => setShowForm(false)}
          className="rounded-lg border border-gray-200 px-3.5 py-2 text-[13px] font-semibold text-gray-600"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}

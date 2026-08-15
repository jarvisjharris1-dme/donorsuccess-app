'use client';

import { useState, useTransition } from 'react';
import { Trash2 } from 'lucide-react';
import { deleteOpportunityAction, type ActionState } from '@/lib/actions/opportunities';

export default function DeleteOpportunityButton({ opportunityId }: { opportunityId: string }) {
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleClick() {
    if (!confirm('Delete this opportunity? This cannot be undone.')) return;
    const formData = new FormData();
    formData.set('id', opportunityId);
    setError(null);
    startTransition(async () => {
      const result: ActionState = await deleteOpportunityAction(undefined, formData);
      if (result?.error) setError(result.error);
    });
  }

  return (
    <div>
      <button
        type="button"
        onClick={handleClick}
        disabled={isPending}
        className="flex items-center gap-1.5 rounded-xl border border-gray-200 px-4 py-2.5 text-[13.5px] font-semibold text-error transition-colors hover:border-error/30 hover:bg-error/5 disabled:opacity-60"
      >
        <Trash2 size={15} />
        {isPending ? 'Deleting…' : 'Delete'}
      </button>
      {error && <p className="mt-2 text-xs font-medium text-red-600">{error}</p>}
    </div>
  );
}

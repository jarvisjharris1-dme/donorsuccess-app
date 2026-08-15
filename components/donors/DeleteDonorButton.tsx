'use client';

import { useState, useTransition } from 'react';
import { Trash2 } from 'lucide-react';
import { deleteDonorAction, type ActionState } from '@/lib/actions/donors';

export default function DeleteDonorButton({ donorId }: { donorId: string }) {
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleClick() {
    if (!confirm('Delete this donor? This removes their gifts, interactions, and pipeline history too. This cannot be undone.')) {
      return;
    }
    const formData = new FormData();
    formData.set('id', donorId);
    setError(null);
    startTransition(async () => {
      const result: ActionState = await deleteDonorAction(undefined, formData);
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
        {isPending ? 'Deleting…' : 'Delete donor'}
      </button>
      {error && <p className="mt-2 text-xs font-medium text-red-600">{error}</p>}
    </div>
  );
}

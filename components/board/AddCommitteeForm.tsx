'use client';

import { useState, useTransition } from 'react';
import { Plus } from 'lucide-react';
import { addCommitteeAction, type ActionState } from '@/lib/actions/board';

export default function AddCommitteeForm({ boardId }: { boardId: string }) {
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const formData = new FormData(form);
    formData.set('boardId', boardId);
    setError(null);
    startTransition(async () => {
      const result: ActionState = await addCommitteeAction(undefined, formData);
      if (result?.error) setError(result.error);
      else {
        form.reset();
        setShowForm(false);
      }
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
        Add committee
      </button>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex items-center gap-2">
      <input
        name="name"
        required
        autoFocus
        placeholder="e.g. Finance"
        className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm"
      />
      <button
        type="submit"
        disabled={isPending}
        className="rounded-lg bg-evergreen px-3 py-1.5 text-[12.5px] font-semibold text-white disabled:opacity-60"
      >
        Add
      </button>
      <button
        type="button"
        onClick={() => setShowForm(false)}
        className="text-[12.5px] font-semibold text-gray-500"
      >
        Cancel
      </button>
      {error && <p className="text-xs font-medium text-error">{error}</p>}
    </form>
  );
}

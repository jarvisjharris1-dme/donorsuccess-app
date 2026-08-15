'use client';

import { useState, useTransition } from 'react';
import { Plus } from 'lucide-react';
import { addBoardIntroductionAction, type ActionState } from '@/lib/actions/board';

export default function AddIntroductionForm({
  boardTermId,
  donorId,
  donorOptions,
}: {
  boardTermId: string;
  donorId: string;
  donorOptions: { id: string; name: string }[];
}) {
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const formData = new FormData(form);
    formData.set('boardTermId', boardTermId);
    formData.set('donorId', donorId);
    setError(null);
    startTransition(async () => {
      const result: ActionState = await addBoardIntroductionAction(undefined, formData);
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
        Log an introduction
      </button>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-2.5 rounded-xl bg-gray-50 p-4">
      <select
        name="prospectDonorId"
        required
        defaultValue=""
        className="rounded-lg border border-gray-200 px-2.5 py-2 text-sm"
      >
        <option value="" disabled>
          Who are they introducing?
        </option>
        {donorOptions.map((d) => (
          <option key={d.id} value={d.id}>
            {d.name}
          </option>
        ))}
      </select>
      <input
        name="notes"
        placeholder="Notes (optional)"
        className="rounded-lg border border-gray-200 px-2.5 py-2 text-sm"
      />
      {error && <p className="text-xs font-medium text-error">{error}</p>}
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={isPending}
          className="rounded-lg bg-evergreen px-3.5 py-2 text-[13px] font-semibold text-white disabled:opacity-60"
        >
          Log it
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

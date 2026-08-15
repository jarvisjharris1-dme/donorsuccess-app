'use client';

import { useState, useTransition } from 'react';
import { Plus } from 'lucide-react';
import { CommitmentType } from '@prisma/client';
import { COMMITMENT_TYPES, COMMITMENT_TYPE_LABELS } from '@/lib/board-engagement';
import { addBoardCommitmentAction, type ActionState } from '@/lib/actions/board';

export default function AddCommitmentForm({ boardTermId, donorId }: { boardTermId: string; donorId: string }) {
  const [showForm, setShowForm] = useState(false);
  const [type, setType] = useState<CommitmentType>(CommitmentType.GIVE);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const usesAmount = type === CommitmentType.GIVE || type === CommitmentType.GET;

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const formData = new FormData(form);
    formData.set('boardTermId', boardTermId);
    formData.set('donorId', donorId);
    setError(null);
    startTransition(async () => {
      const result: ActionState = await addBoardCommitmentAction(undefined, formData);
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
        Add commitment
      </button>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-2.5 rounded-xl bg-gray-50 p-4">
      <div className="grid grid-cols-2 gap-2">
        <select
          name="type"
          value={type}
          onChange={(e) => setType(e.target.value as CommitmentType)}
          className="rounded-lg border border-gray-200 px-2.5 py-2 text-sm"
        >
          {COMMITMENT_TYPES.map((t) => (
            <option key={t} value={t}>
              {COMMITMENT_TYPE_LABELS[t]}
            </option>
          ))}
        </select>
        <input name="dueDate" type="date" className="rounded-lg border border-gray-200 px-2.5 py-2 text-sm" />
      </div>
      <input
        name="description"
        required
        placeholder={usesAmount ? 'e.g. Annual board giving' : 'e.g. Attend all quarterly meetings'}
        className="rounded-lg border border-gray-200 px-2.5 py-2 text-sm"
      />
      {usesAmount ? (
        <input
          name="targetAmount"
          type="number"
          min="0"
          step="0.01"
          placeholder="Target amount"
          className="rounded-lg border border-gray-200 px-2.5 py-2 text-sm"
        />
      ) : (
        <input
          name="targetCount"
          type="number"
          min="1"
          placeholder="Target count (optional)"
          className="rounded-lg border border-gray-200 px-2.5 py-2 text-sm"
        />
      )}
      <label className="flex items-center gap-2 text-xs text-gray-600">
        <input name="isConfidential" type="checkbox" value="true" />
        Keep confidential (hide from general participation views)
      </label>
      {error && <p className="text-xs font-medium text-error">{error}</p>}
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={isPending}
          className="rounded-lg bg-evergreen px-3.5 py-2 text-[13px] font-semibold text-white disabled:opacity-60"
        >
          Add
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

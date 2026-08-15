'use client';

import { useState, useTransition } from 'react';
import { Plus } from 'lucide-react';
import { addBoardMeetingAction, type ActionState } from '@/lib/actions/board';

export default function LogMeetingForm({
  boardId,
  committeeOptions,
}: {
  boardId: string;
  committeeOptions: { id: string; name: string }[];
}) {
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
      const result: ActionState = await addBoardMeetingAction(undefined, formData);
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
        Log a meeting
      </button>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-2.5 rounded-xl bg-gray-50 p-4">
      <div className="grid grid-cols-2 gap-2">
        <input
          name="title"
          required
          placeholder="e.g. Q3 Board Meeting"
          className="rounded-lg border border-gray-200 px-2.5 py-2 text-sm"
        />
        <input name="date" type="date" required className="rounded-lg border border-gray-200 px-2.5 py-2 text-sm" />
      </div>
      {committeeOptions.length > 0 && (
        <select name="committeeId" defaultValue="" className="rounded-lg border border-gray-200 px-2.5 py-2 text-sm">
          <option value="">Full board meeting</option>
          {committeeOptions.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name} committee meeting
            </option>
          ))}
        </select>
      )}
      <textarea
        name="notes"
        rows={3}
        placeholder="Meeting notes / minutes (optional)"
        className="rounded-lg border border-gray-200 px-2.5 py-2 text-sm"
      />
      <p className="text-xs text-gray-500">
        Everyone on the relevant board or committee will default to &ldquo;Attended&rdquo; — correct anyone who was
        excused or absent from their dashboard afterward.
      </p>
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

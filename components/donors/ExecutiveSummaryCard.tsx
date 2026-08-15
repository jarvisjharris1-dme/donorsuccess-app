'use client';

import { useState, useTransition } from 'react';
import { Briefcase, Pencil } from 'lucide-react';
import SubmitButton from '@/components/SubmitButton';
import { updateExecutiveSummaryAction, type ActionState } from '@/lib/actions/donors';

export default function ExecutiveSummaryCard({
  donorId,
  summary,
  canEdit,
}: {
  donorId: string;
  summary: string | null;
  canEdit: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    setError(null);
    startTransition(async () => {
      const result: ActionState = await updateExecutiveSummaryAction(undefined, formData);
      if (result?.error) setError(result.error);
      else setEditing(false);
    });
  }

  return (
    <div className="rounded-[16px] border border-gray-200 bg-white p-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Briefcase size={16} className="text-gray-900" />
          <h2 className="text-[15px] font-bold text-gray-900">Executive summary</h2>
        </div>
        {canEdit && !editing && (
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="flex items-center gap-1.5 text-[13px] font-semibold text-evergreen"
          >
            <Pencil size={13} />
            {summary ? 'Edit' : 'Add summary'}
          </button>
        )}
      </div>

      {editing ? (
        <form onSubmit={handleSubmit} className="mt-3">
          <input type="hidden" name="donorId" value={donorId} />
          <textarea
            name="executiveSummary"
            rows={4}
            autoFocus
            defaultValue={summary ?? ''}
            placeholder="A quick brief someone could read right before a call — where things stand, what matters, what's next."
            className="w-full rounded-[10px] border border-gray-200 px-3.5 py-3 text-sm focus:border-teal focus:outline-none focus:ring-2 focus:ring-teal/20"
          />
          {error && <p className="mt-2 text-xs font-medium text-red-600">{error}</p>}
          <div className="mt-3 flex gap-2.5">
            <SubmitButton pending={isPending}>Save</SubmitButton>
            <button
              type="button"
              onClick={() => setEditing(false)}
              className="rounded-xl border border-gray-200 px-5 py-3.5 text-[15px] font-semibold text-gray-600 transition-colors hover:border-gray-300"
            >
              Cancel
            </button>
          </div>
        </form>
      ) : (
        <p className="mt-3 whitespace-pre-wrap text-[14.5px] leading-relaxed text-gray-900">
          {summary || (
            <span className="text-gray-500">
              No summary yet — add a few sentences an Executive Director could read before a call.
            </span>
          )}
        </p>
      )}
    </div>
  );
}

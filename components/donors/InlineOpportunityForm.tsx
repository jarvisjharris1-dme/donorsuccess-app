'use client';

import { useState, useTransition } from 'react';
import { OpportunityStage } from '@prisma/client';
import SubmitButton from '@/components/SubmitButton';
import { ORDERED_STAGES, STAGE_LABELS } from '@/lib/pipeline';
import { saveOpportunityAction, type ActionState } from '@/lib/actions/opportunities';

export default function InlineOpportunityForm({
  donorId,
  users,
  onDone,
}: {
  donorId: string;
  users: { id: string; name: string | null; email: string }[];
  onDone?: () => void;
}) {
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    setError(null);
    startTransition(async () => {
      const result: ActionState = await saveOpportunityAction(undefined, formData);
      // saveOpportunityAction redirects on success, so reaching here at
      // all means it returned early with an error.
      if (result?.error) setError(result.error);
      else onDone?.();
    });
  }

  const inputClasses =
    'w-full rounded-[10px] border border-gray-200 px-3 py-2.5 text-sm focus:border-teal focus:outline-none focus:ring-2 focus:ring-teal/20';

  return (
    <form
      onSubmit={handleSubmit}
      className="grid grid-cols-2 gap-3 rounded-[14px] border border-gray-200 bg-gray-50 p-4 sm:grid-cols-4"
    >
      <input type="hidden" name="donorId" value={donorId} />

      <div className="col-span-2">
        <label className="mb-1 block text-xs font-semibold text-gray-600">Name</label>
        <input name="name" type="text" required placeholder="e.g. Endowment gift" className={inputClasses} />
      </div>
      <div>
        <label className="mb-1 block text-xs font-semibold text-gray-600">Stage</label>
        <select name="stage" defaultValue={OpportunityStage.IDENTIFICATION} className={inputClasses}>
          {ORDERED_STAGES.map((s) => (
            <option key={s} value={s}>
              {STAGE_LABELS[s]}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className="mb-1 block text-xs font-semibold text-gray-600">Ask amount</label>
        <input name="askAmount" type="number" step="0.01" min="0" className={inputClasses} />
      </div>
      <div>
        <label className="mb-1 block text-xs font-semibold text-gray-600">Expected close</label>
        <input name="expectedCloseDate" type="date" className={inputClasses} />
      </div>
      <div>
        <label className="mb-1 block text-xs font-semibold text-gray-600">Owner</label>
        <select name="ownerId" required defaultValue="" className={inputClasses}>
          <option value="" disabled>
            Select
          </option>
          {users.map((u) => (
            <option key={u.id} value={u.id}>
              {u.name ?? u.email}
            </option>
          ))}
        </select>
      </div>
      <div className="col-span-2 flex items-end sm:col-span-2">
        <SubmitButton pending={isPending}>Add opportunity</SubmitButton>
      </div>

      {error && (
        <p className="col-span-full rounded-lg bg-red-50 px-3 py-2 text-xs font-medium text-red-600">
          {error}
        </p>
      )}
    </form>
  );
}

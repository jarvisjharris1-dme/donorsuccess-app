'use client';

import { useState, useTransition } from 'react';
import { convertGrantToAwardAction, type ActionState } from '@/lib/actions/grants';
import SubmitButton from '@/components/SubmitButton';

export default function ConvertToGrantForm({
  grantOpportunityId,
  users,
}: {
  grantOpportunityId: string;
  users: { id: string; name: string | null; email: string }[];
}) {
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    formData.set('grantOpportunityId', grantOpportunityId);
    setError(null);
    startTransition(async () => {
      const result: ActionState = await convertGrantToAwardAction(undefined, formData);
      if (result?.error) setError(result.error);
    });
  }

  const inputClasses =
    'w-full rounded-[10px] border border-gray-200 px-3.5 py-3 text-sm focus:border-teal focus:outline-none focus:ring-2 focus:ring-teal/20';
  const labelClasses = 'mb-1.5 block text-[13px] font-semibold text-gray-900';

  return (
    <div className="rounded-[16px] border border-success/30 bg-success/5 p-6">
      <h2 className="text-[15px] font-bold text-gray-900">Convert to a tracked grant</h2>
      <p className="mt-1 text-sm text-gray-600">
        This sets up the award details and starts a compliance plan — the ongoing reporting
        obligations that come with the money.
      </p>

      <form onSubmit={handleSubmit} className="mt-4 flex flex-col gap-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="awardAmount" className={labelClasses}>
              Award amount
            </label>
            <input id="awardAmount" name="awardAmount" type="number" min="0" step="0.01" required className={inputClasses} />
          </div>
          <div>
            <label htmlFor="complianceOwnerId" className={labelClasses}>
              Compliance owner
            </label>
            <select id="complianceOwnerId" name="complianceOwnerId" required defaultValue="" className={inputClasses}>
              <option value="" disabled>
                Assign a compliance owner
              </option>
              {users.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name ?? u.email}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="periodStart" className={labelClasses}>
              Grant period start
            </label>
            <input id="periodStart" name="periodStart" type="date" required className={inputClasses} />
          </div>
          <div>
            <label htmlFor="periodEnd" className={labelClasses}>
              Grant period end (optional)
            </label>
            <input id="periodEnd" name="periodEnd" type="date" className={inputClasses} />
          </div>
        </div>

        <div>
          <label htmlFor="restrictedUseNotes" className={labelClasses}>
            Restricted use notes (optional)
          </label>
          <textarea
            id="restrictedUseNotes"
            name="restrictedUseNotes"
            rows={2}
            placeholder="What the funder requires this money be used for"
            className={`${inputClasses} resize-y`}
          />
        </div>

        {error && (
          <p className="rounded-lg bg-red-50 px-3.5 py-2.5 text-sm font-medium text-red-600">{error}</p>
        )}

        <div>
          <SubmitButton pending={isPending}>Convert to grant</SubmitButton>
        </div>
      </form>
    </div>
  );
}

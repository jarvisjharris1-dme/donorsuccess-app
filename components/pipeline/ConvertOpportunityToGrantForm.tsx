'use client';

import { useState, useTransition } from 'react';
import { GrantStage } from '@prisma/client';
import SubmitButton from '@/components/SubmitButton';
import { GRANT_STAGE_LABELS } from '@/lib/grants';
import { convertOpportunityToGrantAction, type ActionState } from '@/lib/actions/convert-opportunity';

export default function ConvertOpportunityToGrantForm({
  opportunityId,
  defaults,
  users,
}: {
  opportunityId: string;
  defaults: {
    name: string;
    askAmount: string;
    stage: GrantStage;
    grantWriterId: string;
    expectedCloseDate: string | null;
    notes: string | null;
  };
  users: { id: string; name: string | null; email: string }[];
}) {
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    formData.set('opportunityId', opportunityId);
    setError(null);
    startTransition(async () => {
      const result: ActionState = await convertOpportunityToGrantAction(undefined, formData);
      if (result?.error) setError(result.error);
    });
  }

  const inputClasses =
    'w-full rounded-[10px] border border-gray-200 px-3.5 py-3 text-sm focus:border-teal focus:outline-none focus:ring-2 focus:ring-teal/20';
  const labelClasses = 'mb-1.5 block text-[13px] font-semibold text-gray-900';

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
      <div className="rounded-[16px] border border-gray-200 p-5">
        <div className="flex flex-col gap-4">
          <div>
            <label htmlFor="name" className={labelClasses}>
              Grant name
            </label>
            <input id="name" name="name" required defaultValue={defaults.name} className={inputClasses} />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="askAmount" className={labelClasses}>
                Ask amount
              </label>
              <input
                id="askAmount"
                name="askAmount"
                type="number"
                min="0"
                step="0.01"
                required
                defaultValue={defaults.askAmount}
                className={inputClasses}
              />
            </div>
            <div>
              <label htmlFor="stage" className={labelClasses}>
                Stage
              </label>
              <select id="stage" name="stage" defaultValue={defaults.stage} className={inputClasses}>
                {Object.values(GrantStage).map((s) => (
                  <option key={s} value={s}>
                    {GRANT_STAGE_LABELS[s]}
                  </option>
                ))}
              </select>
              <p className="mt-1 text-xs text-gray-500">
                Mapped from the opportunity&rsquo;s stage automatically &mdash; check this is actually
                right before saving.
              </p>
            </div>
          </div>

          <div>
            <label htmlFor="grantWriterId" className={labelClasses}>
              Grant writer
            </label>
            <select id="grantWriterId" name="grantWriterId" defaultValue={defaults.grantWriterId} className={inputClasses}>
              {users.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name ?? u.email}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="applicationDeadline" className={labelClasses}>
                Application deadline
              </label>
              <input id="applicationDeadline" name="applicationDeadline" type="date" className={inputClasses} />
            </div>
            <div>
              <label htmlFor="decisionExpectedDate" className={labelClasses}>
                Decision expected
              </label>
              <input
                id="decisionExpectedDate"
                name="decisionExpectedDate"
                type="date"
                defaultValue={defaults.expectedCloseDate ?? ''}
                className={inputClasses}
              />
            </div>
          </div>

          <div>
            <label htmlFor="notes" className={labelClasses}>
              Notes
            </label>
            <textarea
              id="notes"
              name="notes"
              rows={3}
              defaultValue={defaults.notes ?? ''}
              className={`${inputClasses} resize-y`}
            />
          </div>
        </div>
      </div>

      {error && (
        <p className="rounded-lg bg-red-50 px-3.5 py-2.5 text-sm font-medium text-red-600">{error}</p>
      )}

      <div>
        <SubmitButton pending={isPending}>Convert to grant</SubmitButton>
      </div>
    </form>
  );
}

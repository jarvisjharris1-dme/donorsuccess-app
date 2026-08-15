'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { OpportunityStage } from '@prisma/client';
import SubmitButton from '@/components/SubmitButton';
import { ORDERED_STAGES, STAGE_LABELS } from '@/lib/pipeline';
import { toDateInputValue } from '@/lib/format';
import { saveOpportunityAction, type ActionState } from '@/lib/actions/opportunities';

type OpportunityFormValues = {
  id?: string;
  donorId: string;
  name: string;
  stage: OpportunityStage;
  askAmount?: number | string | null;
  expectedAmount?: number | string | null;
  probability?: number | null;
  expectedCloseDate?: Date | string | null;
  ownerId: string;
  notes?: string | null;
};

export default function OpportunityForm({
  opportunity,
  donors,
  users,
  defaultDonorId,
}: {
  opportunity?: OpportunityFormValues;
  donors: { id: string; name: string }[];
  users: { id: string; name: string | null; email: string }[];
  defaultDonorId?: string;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    setError(null);
    startTransition(async () => {
      const result: ActionState = await saveOpportunityAction(undefined, formData);
      if (result?.error) setError(result.error);
    });
  }

  const inputClasses =
    'w-full rounded-[10px] border border-gray-200 px-3.5 py-3 text-sm focus:border-teal focus:outline-none focus:ring-2 focus:ring-teal/20';
  const labelClasses = 'mb-1.5 block text-[13px] font-semibold text-gray-900';

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6">
      {opportunity?.id && <input type="hidden" name="id" value={opportunity.id} />}

      <div className="rounded-[16px] border border-gray-200 p-5">
        <h3 className="mb-4 text-[13px] font-bold uppercase tracking-wide text-gray-600">
          Opportunity
        </h3>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label htmlFor="name" className={labelClasses}>
              Name
            </label>
            <input
              id="name"
              name="name"
              type="text"
              required
              defaultValue={opportunity?.name ?? ''}
              placeholder="e.g. Annual major gift ask"
              className={inputClasses}
            />
          </div>
          <div>
            <label htmlFor="donorId" className={labelClasses}>
              Donor
            </label>
            <select
              id="donorId"
              name="donorId"
              required
              defaultValue={opportunity?.donorId ?? defaultDonorId ?? ''}
              className={inputClasses}
            >
              <option value="" disabled>
                Select a donor
              </option>
              {donors.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="stage" className={labelClasses}>
              Stage
            </label>
            <select
              id="stage"
              name="stage"
              defaultValue={opportunity?.stage ?? OpportunityStage.IDENTIFICATION}
              className={inputClasses}
            >
              {ORDERED_STAGES.map((s) => (
                <option key={s} value={s}>
                  {STAGE_LABELS[s]}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className="rounded-[16px] border border-gray-200 p-5">
        <h3 className="mb-4 text-[13px] font-bold uppercase tracking-wide text-gray-600">
          Forecasting
        </h3>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <div>
            <label htmlFor="askAmount" className={labelClasses}>
              Ask amount
            </label>
            <input
              id="askAmount"
              name="askAmount"
              type="number"
              step="0.01"
              min="0"
              defaultValue={opportunity?.askAmount?.toString() ?? ''}
              className={inputClasses}
            />
          </div>
          <div>
            <label htmlFor="expectedAmount" className={labelClasses}>
              Expected amount
            </label>
            <input
              id="expectedAmount"
              name="expectedAmount"
              type="number"
              step="0.01"
              min="0"
              defaultValue={opportunity?.expectedAmount?.toString() ?? ''}
              className={inputClasses}
            />
          </div>
          <div>
            <label htmlFor="probability" className={labelClasses}>
              Probability %
            </label>
            <input
              id="probability"
              name="probability"
              type="number"
              min="0"
              max="100"
              defaultValue={opportunity?.probability ?? ''}
              className={inputClasses}
            />
          </div>
          <div>
            <label htmlFor="expectedCloseDate" className={labelClasses}>
              Expected close
            </label>
            <input
              id="expectedCloseDate"
              name="expectedCloseDate"
              type="date"
              defaultValue={toDateInputValue(opportunity?.expectedCloseDate)}
              className={inputClasses}
            />
          </div>
        </div>
      </div>

      <div className="rounded-[16px] border border-gray-200 p-5">
        <h3 className="mb-4 text-[13px] font-bold uppercase tracking-wide text-gray-600">
          Ownership &amp; notes
        </h3>
        <div className="grid grid-cols-1 gap-4">
          <div>
            <label htmlFor="ownerId" className={labelClasses}>
              Owner
            </label>
            <select
              id="ownerId"
              name="ownerId"
              required
              defaultValue={opportunity?.ownerId ?? ''}
              className={inputClasses}
            >
              <option value="" disabled>
                Select an owner
              </option>
              {users.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name ?? u.email}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="notes" className={labelClasses}>
              Notes
            </label>
            <textarea
              id="notes"
              name="notes"
              rows={4}
              defaultValue={opportunity?.notes ?? ''}
              className={`${inputClasses} resize-y`}
            />
          </div>
        </div>
      </div>

      {error && (
        <p className="rounded-lg bg-red-50 px-3.5 py-2.5 text-sm font-medium text-red-600">
          {error}
        </p>
      )}

      <div className="flex gap-3">
        <SubmitButton pending={isPending}>
          {opportunity?.id ? 'Save changes' : 'Create opportunity'}
        </SubmitButton>
        <button
          type="button"
          onClick={() => router.back()}
          className="rounded-xl border border-gray-200 px-6 py-3.5 text-[15px] font-semibold text-gray-600 transition-colors hover:border-gray-300"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}

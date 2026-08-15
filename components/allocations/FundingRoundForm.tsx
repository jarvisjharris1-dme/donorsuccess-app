'use client';

import { useState, useTransition } from 'react';
import SubmitButton from '@/components/SubmitButton';
import { saveFundingRoundAction, type ActionState } from '@/lib/actions/funding-rounds';

export type FundingRoundFormValues = {
  id?: string;
  name: string;
  description?: string | null;
  totalPool: string;
  opensAt?: string | null;
  closesAt?: string | null;
  categories: string[];
  rubricCriteria: string[];
};

export default function FundingRoundForm({ round }: { round?: FundingRoundFormValues }) {
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    setError(null);
    startTransition(async () => {
      const result: ActionState = await saveFundingRoundAction(undefined, formData);
      if (result?.error) setError(result.error);
    });
  }

  const inputClasses =
    'w-full rounded-[10px] border border-gray-200 px-3.5 py-3 text-sm focus:border-teal focus:outline-none focus:ring-2 focus:ring-teal/20';
  const labelClasses = 'mb-1.5 block text-[13px] font-semibold text-gray-900';

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      {round?.id && <input type="hidden" name="id" value={round.id} />}

      <div>
        <label htmlFor="name" className={labelClasses}>
          Round name
        </label>
        <input
          id="name"
          name="name"
          required
          defaultValue={round?.name ?? ''}
          placeholder="EFSP Phase 41 (FY2023)"
          className={inputClasses}
        />
      </div>

      <div>
        <label htmlFor="description" className={labelClasses}>
          Description (optional)
        </label>
        <textarea
          id="description"
          name="description"
          rows={2}
          defaultValue={round?.description ?? ''}
          className={`${inputClasses} resize-y`}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label htmlFor="totalPool" className={labelClasses}>
            Total pool
          </label>
          <input
            id="totalPool"
            name="totalPool"
            type="number"
            min="0"
            step="0.01"
            required
            defaultValue={round?.totalPool ?? ''}
            className={inputClasses}
          />
        </div>
        <div />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label htmlFor="opensAt" className={labelClasses}>
            Opens
          </label>
          <input id="opensAt" name="opensAt" type="date" defaultValue={round?.opensAt ?? ''} className={inputClasses} />
        </div>
        <div>
          <label htmlFor="closesAt" className={labelClasses}>
            Closes
          </label>
          <input
            id="closesAt"
            name="closesAt"
            type="date"
            defaultValue={round?.closesAt ?? ''}
            className={inputClasses}
          />
        </div>
      </div>

      <div>
        <label htmlFor="categories" className={labelClasses}>
          Service categories
        </label>
        <textarea
          id="categories"
          name="categories"
          rows={4}
          required
          defaultValue={round?.categories.join('\n') ?? ''}
          placeholder={'Emergency Housing\nEmergency Feeding\nUtilities'}
          className={`${inputClasses} resize-y font-mono text-[13px]`}
        />
        <p className="mt-1.5 text-xs text-gray-600">
          One category per line — the funding categories applicants can request under.
        </p>
      </div>

      <div>
        <label htmlFor="rubricCriteria" className={labelClasses}>
          Scoring rubric
        </label>
        <textarea
          id="rubricCriteria"
          name="rubricCriteria"
          rows={4}
          required
          defaultValue={round?.rubricCriteria.join('\n') ?? ''}
          placeholder={'Fills a genuine service gap\nClarity of intake and delivery process\nCollaboration with other providers\nFiscal responsibility and prior performance'}
          className={`${inputClasses} resize-y font-mono text-[13px]`}
        />
        <p className="mt-1.5 text-xs text-gray-600">
          One criterion per line — reviewers score each 0 to 5.
        </p>
      </div>

      {error && (
        <p className="rounded-lg bg-red-50 px-3.5 py-2.5 text-sm font-medium text-red-600">{error}</p>
      )}

      <div className="mt-1">
        <SubmitButton pending={isPending}>{round?.id ? 'Save changes' : 'Create funding round'}</SubmitButton>
      </div>
    </form>
  );
}

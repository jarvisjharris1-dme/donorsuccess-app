'use client';

import { useState, useTransition } from 'react';
import SubmitButton from '@/components/SubmitButton';
import { saveGrantOpportunityAction, type ActionState } from '@/lib/actions/grants';

export type GrantFormValues = {
  id?: string;
  donorId: string;
  name: string;
  programName?: string | null;
  askAmount: string;
  applicationDeadline?: string | null;
  decisionExpectedDate?: string | null;
  notes?: string | null;
  grantWriterId: string;
};

export default function GrantForm({
  grant,
  funders,
  users,
}: {
  grant?: GrantFormValues;
  funders: { id: string; name: string }[];
  users: { id: string; name: string | null; email: string }[];
}) {
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    setError(null);
    startTransition(async () => {
      const result: ActionState = await saveGrantOpportunityAction(undefined, formData);
      if (result?.error) setError(result.error);
    });
  }

  const inputClasses =
    'w-full rounded-[10px] border border-gray-200 px-3.5 py-3 text-sm focus:border-teal focus:outline-none focus:ring-2 focus:ring-teal/20';
  const labelClasses = 'mb-1.5 block text-[13px] font-semibold text-gray-900';

  if (funders.length === 0) {
    return (
      <div className="rounded-[16px] border border-dashed border-gray-200 p-6 text-center text-sm text-gray-600">
        You need at least one Organization, Foundation, or Corporation donor before creating a
        grant opportunity.{' '}
        <a href="/donors/new" className="font-semibold text-evergreen">
          Add one first →
        </a>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      {grant?.id && <input type="hidden" name="id" value={grant.id} />}

      <div>
        <label htmlFor="donorId" className={labelClasses}>
          Funder
        </label>
        <select id="donorId" name="donorId" required defaultValue={grant?.donorId ?? ''} className={inputClasses}>
          <option value="" disabled>
            Select a funder
          </option>
          {funders.map((f) => (
            <option key={f.id} value={f.id}>
              {f.name}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label htmlFor="name" className={labelClasses}>
          Grant name
        </label>
        <input
          id="name"
          name="name"
          required
          defaultValue={grant?.name ?? ''}
          placeholder="Youth Literacy Initiative"
          className={inputClasses}
        />
      </div>

      <div>
        <label htmlFor="programName" className={labelClasses}>
          Program name (optional)
        </label>
        <input
          id="programName"
          name="programName"
          defaultValue={grant?.programName ?? ''}
          placeholder="Education Program"
          className={inputClasses}
        />
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
            defaultValue={grant?.askAmount ?? ''}
            className={inputClasses}
          />
        </div>
        <div>
          <label htmlFor="grantWriterId" className={labelClasses}>
            Grant writer
          </label>
          <select
            id="grantWriterId"
            name="grantWriterId"
            required
            defaultValue={grant?.grantWriterId ?? ''}
            className={inputClasses}
          >
            <option value="" disabled>
              Assign a grant writer
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
          <label htmlFor="applicationDeadline" className={labelClasses}>
            Application deadline
          </label>
          <input
            id="applicationDeadline"
            name="applicationDeadline"
            type="date"
            defaultValue={grant?.applicationDeadline ?? ''}
            className={inputClasses}
          />
        </div>
        <div>
          <label htmlFor="decisionExpectedDate" className={labelClasses}>
            Decision expected
          </label>
          <input
            id="decisionExpectedDate"
            name="decisionExpectedDate"
            type="date"
            defaultValue={grant?.decisionExpectedDate ?? ''}
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
          defaultValue={grant?.notes ?? ''}
          className={`${inputClasses} resize-y`}
        />
      </div>

      {error && (
        <p className="rounded-lg bg-red-50 px-3.5 py-2.5 text-sm font-medium text-red-600">{error}</p>
      )}

      <div className="mt-1">
        <SubmitButton pending={isPending}>
          {grant?.id ? 'Save changes' : 'Create grant opportunity'}
        </SubmitButton>
      </div>
    </form>
  );
}

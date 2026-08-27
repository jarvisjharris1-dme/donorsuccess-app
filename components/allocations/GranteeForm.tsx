'use client';

import { useState, useTransition } from 'react';
import SubmitButton from '@/components/SubmitButton';
import { saveGranteeAction, type ActionState } from '@/lib/actions/grantees';

export type GranteeFormValues = {
  id?: string;
  legalName: string;
  ein?: string | null;
  contactName?: string | null;
  contactEmail?: string | null;
  contactPhone?: string | null;
  addressLine1?: string | null;
  addressLine2?: string | null;
  city?: string | null;
  state?: string | null;
  postalCode?: string | null;
  missionSummary?: string | null;
};

export default function GranteeForm({ grantee }: { grantee?: GranteeFormValues }) {
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    setError(null);
    startTransition(async () => {
      const result: ActionState = await saveGranteeAction(undefined, formData);
      if (result?.error) setError(result.error);
    });
  }

  const inputClasses =
    'w-full rounded-[10px] border border-gray-200 px-3.5 py-3 text-sm focus:border-teal focus:outline-none focus:ring-2 focus:ring-teal/20';
  const labelClasses = 'mb-1.5 block text-[13px] font-semibold text-gray-900';

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      {grantee?.id && <input type="hidden" name="id" value={grantee.id} />}

      <div>
        <label htmlFor="legalName" className={labelClasses}>
          Legal name
        </label>
        <input
          id="legalName"
          name="legalName"
          required
          defaultValue={grantee?.legalName ?? ''}
          placeholder="Community Alliance for the Homeless Inc"
          className={inputClasses}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label htmlFor="ein" className={labelClasses}>
            EIN
          </label>
          <input id="ein" name="ein" defaultValue={grantee?.ein ?? ''} placeholder="62-1616145" className={inputClasses} />
        </div>
        <div>
          <label htmlFor="contactName" className={labelClasses}>
            Primary contact
          </label>
          <input id="contactName" name="contactName" defaultValue={grantee?.contactName ?? ''} className={inputClasses} />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label htmlFor="contactEmail" className={labelClasses}>
            Contact email
          </label>
          <input
            id="contactEmail"
            name="contactEmail"
            type="email"
            defaultValue={grantee?.contactEmail ?? ''}
            className={inputClasses}
          />
        </div>
        <div>
          <label htmlFor="contactPhone" className={labelClasses}>
            Contact phone
          </label>
          <input id="contactPhone" name="contactPhone" defaultValue={grantee?.contactPhone ?? ''} className={inputClasses} />
        </div>
      </div>

      <div>
        <label htmlFor="addressLine1" className={labelClasses}>
          Address
        </label>
        <input
          id="addressLine1"
          name="addressLine1"
          defaultValue={grantee?.addressLine1 ?? ''}
          className={`${inputClasses} mb-2`}
        />
        <input id="addressLine2" name="addressLine2" defaultValue={grantee?.addressLine2 ?? ''} className={inputClasses} />
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div>
          <label htmlFor="city" className={labelClasses}>
            City
          </label>
          <input id="city" name="city" defaultValue={grantee?.city ?? ''} className={inputClasses} />
        </div>
        <div>
          <label htmlFor="state" className={labelClasses}>
            State
          </label>
          <input id="state" name="state" defaultValue={grantee?.state ?? ''} className={inputClasses} />
        </div>
        <div>
          <label htmlFor="postalCode" className={labelClasses}>
            Postal code
          </label>
          <input id="postalCode" name="postalCode" defaultValue={grantee?.postalCode ?? ''} className={inputClasses} />
        </div>
      </div>

      <div>
        <label htmlFor="missionSummary" className={labelClasses}>
          Mission summary (optional)
        </label>
        <textarea
          id="missionSummary"
          name="missionSummary"
          rows={2}
          defaultValue={grantee?.missionSummary ?? ''}
          className={`${inputClasses} resize-y`}
        />
      </div>

      {error && (
        <p className="rounded-lg bg-red-50 px-3.5 py-2.5 text-sm font-medium text-red-600">{error}</p>
      )}

      <div className="mt-1">
        <SubmitButton pending={isPending}>{grantee?.id ? 'Save changes' : 'Add grantee'}</SubmitButton>
      </div>
    </form>
  );
}

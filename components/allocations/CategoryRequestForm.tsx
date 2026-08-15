'use client';

import { useState, useTransition } from 'react';
import { saveCategoryRequestAction, deleteCategoryRequestAction, type ActionState } from '@/lib/actions/grantee-applications';

export type CategoryRequestValues = {
  id?: string;
  category: string;
  requestedAmount: string;
  targetPopulation?: string | null;
  intakeProcess?: string | null;
  deliveryMethod?: string | null;
  county?: string | null;
  serviceLocation?: string | null;
  unitsProjected?: number | null;
};

export default function CategoryRequestForm({
  applicationId,
  availableCategories,
  request,
  onDone,
}: {
  applicationId: string;
  availableCategories: string[];
  request?: CategoryRequestValues;
  onDone?: () => void;
}) {
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const boundAction = saveCategoryRequestAction.bind(null, applicationId);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    setError(null);
    startTransition(async () => {
      const result: ActionState = await boundAction(undefined, formData);
      if (result?.error) setError(result.error);
      else onDone?.();
    });
  }

  function handleDelete() {
    if (!request?.id) return;
    startTransition(async () => {
      const result: ActionState = await deleteCategoryRequestAction(request.id!);
      if (result?.error) setError(result.error);
      else onDone?.();
    });
  }

  const inputClasses =
    'w-full rounded-[8px] border border-gray-200 px-3 py-2 text-[13px] focus:border-teal focus:outline-none focus:ring-2 focus:ring-teal/20';
  const labelClasses = 'mb-1 block text-[12px] font-semibold text-gray-700';

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3 rounded-[12px] border border-gray-200 bg-gray-50 p-4">
      {request?.id && <input type="hidden" name="id" value={request.id} />}

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={labelClasses}>Category</label>
          <select name="category" required defaultValue={request?.category ?? ''} className={inputClasses}>
            <option value="" disabled>
              Select a category
            </option>
            {availableCategories.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className={labelClasses}>Funding requested</label>
          <input
            name="requestedAmount"
            type="number"
            min="0"
            step="0.01"
            required
            defaultValue={request?.requestedAmount ?? ''}
            className={inputClasses}
          />
        </div>
      </div>

      <div>
        <label className={labelClasses}>Target population</label>
        <input name="targetPopulation" defaultValue={request?.targetPopulation ?? ''} className={inputClasses} />
      </div>

      <div>
        <label className={labelClasses}>Intake process</label>
        <textarea
          name="intakeProcess"
          rows={2}
          defaultValue={request?.intakeProcess ?? ''}
          className={`${inputClasses} resize-y`}
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={labelClasses}>Delivery method</label>
          <input name="deliveryMethod" defaultValue={request?.deliveryMethod ?? ''} className={inputClasses} />
        </div>
        <div>
          <label className={labelClasses}>County</label>
          <input name="county" defaultValue={request?.county ?? ''} className={inputClasses} />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={labelClasses}>Service location</label>
          <input name="serviceLocation" defaultValue={request?.serviceLocation ?? ''} className={inputClasses} />
        </div>
        <div>
          <label className={labelClasses}>Units projected</label>
          <input
            name="unitsProjected"
            type="number"
            min="0"
            defaultValue={request?.unitsProjected ?? ''}
            className={inputClasses}
          />
        </div>
      </div>

      {error && <p className="text-[12px] font-medium text-red-600">{error}</p>}

      <div className="flex items-center gap-2">
        <button
          type="submit"
          disabled={isPending}
          className="rounded-[8px] bg-evergreen px-3.5 py-2 text-[12px] font-semibold text-white hover:bg-[#0d685f] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isPending ? 'Saving…' : request?.id ? 'Save' : 'Add category request'}
        </button>
        {request?.id && (
          <button
            type="button"
            onClick={handleDelete}
            disabled={isPending}
            className="rounded-[8px] border border-gray-200 px-3.5 py-2 text-[12px] font-semibold text-gray-600 hover:bg-white disabled:cursor-not-allowed disabled:opacity-60"
          >
            Remove
          </button>
        )}
        {onDone && (
          <button
            type="button"
            onClick={onDone}
            className="text-[12px] font-medium text-gray-500 hover:text-gray-700"
          >
            Cancel
          </button>
        )}
      </div>
    </form>
  );
}

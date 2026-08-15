'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { FrameworkStage, PlanStatus, PlanType } from '@prisma/client';
import SubmitButton from '@/components/SubmitButton';
import {
  FRAMEWORK_STAGES,
  STAGE_LABELS,
  PLAN_STATUSES,
  PLAN_STATUS_LABELS,
  PLAN_TYPES,
  PLAN_TYPE_LABELS,
} from '@/lib/success-plans';
import { toDateInputValue } from '@/lib/format';
import { savePlanAction, type ActionState } from '@/lib/actions/plans';

type PlanFormValues = {
  id?: string;
  title: string;
  stage: FrameworkStage;
  planType: PlanType;
  status: PlanStatus;
  objective?: string | null;
  strategyNotes?: string | null;
  targetAskAmount?: number | string | null;
  targetGiftDate?: Date | string | null;
  reviewCadence?: string | null;
  targetCompletionDate?: Date | string | null;
  ownerId: string;
};

export default function PlanForm({
  donorId,
  plan,
  users,
}: {
  donorId: string;
  plan?: PlanFormValues;
  users: { id: string; name: string | null; email: string }[];
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    setError(null);
    startTransition(async () => {
      const result: ActionState = await savePlanAction(undefined, formData);
      if (result?.error) setError(result.error);
    });
  }

  const inputClasses =
    'w-full rounded-[10px] border border-gray-200 px-3.5 py-3 text-sm focus:border-teal focus:outline-none focus:ring-2 focus:ring-teal/20';
  const labelClasses = 'mb-1.5 block text-[13px] font-semibold text-gray-900';

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6">
      {plan?.id && <input type="hidden" name="id" value={plan.id} />}
      <input type="hidden" name="donorId" value={donorId} />

      <div className="rounded-[16px] border border-gray-200 p-5">
        <h3 className="mb-4 text-[13px] font-bold uppercase tracking-wide text-gray-600">Plan</h3>
        <div className="grid grid-cols-1 gap-4">
          <div>
            <label htmlFor="title" className={labelClasses}>
              Title
            </label>
            <input
              id="title"
              name="title"
              type="text"
              required
              defaultValue={plan?.title ?? ''}
              placeholder="e.g. FY26 Major Gift Cultivation Plan"
              className={inputClasses}
            />
          </div>
          <div>
            <label htmlFor="objective" className={labelClasses}>
              Objective
            </label>
            <textarea
              id="objective"
              name="objective"
              rows={2}
              defaultValue={plan?.objective ?? ''}
              placeholder="What does success look like for this donor?"
              className={`${inputClasses} resize-y`}
            />
          </div>
          <div>
            <label htmlFor="strategyNotes" className={labelClasses}>
              Strategy notes
            </label>
            <textarea
              id="strategyNotes"
              name="strategyNotes"
              rows={4}
              defaultValue={plan?.strategyNotes ?? ''}
              placeholder="Approach, talking points, who else is involved..."
              className={`${inputClasses} resize-y`}
            />
          </div>
        </div>
      </div>

      <div className="rounded-[16px] border border-gray-200 p-5">
        <h3 className="mb-4 text-[13px] font-bold uppercase tracking-wide text-gray-600">
          Stage &amp; status
        </h3>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div>
            <label htmlFor="stage" className={labelClasses}>
              Framework stage
            </label>
            <select
              id="stage"
              name="stage"
              defaultValue={plan?.stage ?? FrameworkStage.ENGAGE}
              className={inputClasses}
            >
              {FRAMEWORK_STAGES.map((s) => (
                <option key={s} value={s}>
                  {STAGE_LABELS[s]}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="planType" className={labelClasses}>
              Plan type
            </label>
            <select
              id="planType"
              name="planType"
              defaultValue={plan?.planType ?? PlanType.GENERAL}
              className={inputClasses}
            >
              {PLAN_TYPES.map((t) => (
                <option key={t} value={t}>
                  {PLAN_TYPE_LABELS[t]}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="status" className={labelClasses}>
              Status
            </label>
            <select
              id="status"
              name="status"
              defaultValue={plan?.status ?? PlanStatus.ACTIVE}
              className={inputClasses}
            >
              {PLAN_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {PLAN_STATUS_LABELS[s]}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className="rounded-[16px] border border-gray-200 p-5">
        <h3 className="mb-4 text-[13px] font-bold uppercase tracking-wide text-gray-600">
          Targets &amp; ownership
        </h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="targetAskAmount" className={labelClasses}>
              Target ask amount
            </label>
            <input
              id="targetAskAmount"
              name="targetAskAmount"
              type="number"
              step="0.01"
              min="0"
              defaultValue={plan?.targetAskAmount?.toString() ?? ''}
              className={inputClasses}
            />
          </div>
          <div>
            <label htmlFor="targetGiftDate" className={labelClasses}>
              Target gift date
            </label>
            <input
              id="targetGiftDate"
              name="targetGiftDate"
              type="date"
              defaultValue={toDateInputValue(plan?.targetGiftDate)}
              className={inputClasses}
            />
          </div>
          <div>
            <label htmlFor="reviewCadence" className={labelClasses}>
              Review cadence
            </label>
            <input
              id="reviewCadence"
              name="reviewCadence"
              type="text"
              placeholder="e.g. Quarterly"
              defaultValue={plan?.reviewCadence ?? ''}
              className={inputClasses}
            />
          </div>
          <div>
            <label htmlFor="targetCompletionDate" className={labelClasses}>
              Target completion
            </label>
            <input
              id="targetCompletionDate"
              name="targetCompletionDate"
              type="date"
              defaultValue={toDateInputValue(plan?.targetCompletionDate)}
              className={inputClasses}
            />
          </div>
          <div className="col-span-2">
            <label htmlFor="ownerId" className={labelClasses}>
              Owner
            </label>
            <select
              id="ownerId"
              name="ownerId"
              required
              defaultValue={plan?.ownerId ?? ''}
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
        </div>
      </div>

      {error && (
        <p className="rounded-lg bg-red-50 px-3.5 py-2.5 text-sm font-medium text-red-600">
          {error}
        </p>
      )}

      <div className="flex gap-3">
        <SubmitButton pending={isPending}>{plan?.id ? 'Save changes' : 'Create plan'}</SubmitButton>
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

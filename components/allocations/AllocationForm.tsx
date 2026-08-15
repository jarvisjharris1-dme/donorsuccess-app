'use client';

import { useState, useTransition } from 'react';
import { decideAllocationAction, type ActionState } from '@/lib/actions/allocations';
import { formatCurrency } from '@/lib/format';

export default function AllocationForm({
  categoryRequestId,
  category,
  requestedAmount,
  previousAllocated,
  allocatedAmount,
  awardAmount,
}: {
  categoryRequestId: string;
  category: string;
  requestedAmount: string;
  previousAllocated?: string;
  allocatedAmount?: string;
  awardAmount?: string;
}) {
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    setMessage(null);
    startTransition(async () => {
      const result: ActionState = await decideAllocationAction(undefined, formData);
      if (result?.error) setMessage(result.error);
      else if (result?.success) setMessage(result.success);
    });
  }

  const inputClasses =
    'w-full rounded-[8px] border border-gray-200 px-3 py-2 text-[13px] text-right focus:border-teal focus:outline-none focus:ring-2 focus:ring-teal/20';

  return (
    <form onSubmit={handleSubmit} className="grid grid-cols-[1fr_repeat(4,110px)_auto] items-center gap-3 border-t border-gray-100 py-3 first:border-t-0">
      <input type="hidden" name="categoryRequestId" value={categoryRequestId} />
      <p className="text-[13px] font-medium text-gray-900">{category}</p>
      <p className="text-right text-[13px] text-gray-600">{formatCurrency(previousAllocated ?? '0')}</p>
      <p className="text-right text-[13px] text-gray-600">{formatCurrency(requestedAmount)}</p>
      <input
        name="allocatedAmount"
        type="number"
        min="0"
        step="0.01"
        defaultValue={allocatedAmount ?? '0'}
        className={inputClasses}
      />
      <input
        name="awardAmount"
        type="number"
        min="0"
        step="0.01"
        defaultValue={awardAmount ?? '0'}
        className={inputClasses}
      />
      <button
        type="submit"
        disabled={isPending}
        className="rounded-[8px] border border-gray-200 px-3 py-2 text-[12px] font-semibold text-gray-900 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isPending ? '…' : 'Save'}
      </button>
      {message && <p className="col-span-6 text-[12px] font-medium text-gray-600">{message}</p>}
    </form>
  );
}

'use client';

import { useState, useTransition } from 'react';
import { GiftType, PaymentMethod } from '@prisma/client';
import SubmitButton from '@/components/SubmitButton';
import { createGiftAction, type ActionState } from '@/lib/actions/gifts';

const GIFT_TYPE_LABELS: Record<GiftType, string> = {
  ONE_TIME: 'One-time',
  RECURRING: 'Recurring',
  PLEDGE: 'Pledge',
  IN_KIND: 'In-kind',
  GRANT: 'Grant',
};

const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  CREDIT_CARD: 'Credit card',
  ACH: 'ACH',
  CHECK: 'Check',
  CASH: 'Cash',
  STOCK: 'Stock',
  OTHER: 'Other',
};

export default function GiftForm({
  donorId,
  campaigns,
  onDone,
}: {
  donorId: string;
  campaigns: { id: string; name: string }[];
  onDone?: () => void;
}) {
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const formData = new FormData(form);
    setError(null);
    startTransition(async () => {
      const result: ActionState = await createGiftAction(undefined, formData);
      if (result?.error) {
        setError(result.error);
      } else {
        form.reset();
        onDone?.();
      }
    });
  }

  const inputClasses =
    'w-full rounded-[10px] border border-gray-200 px-3 py-2.5 text-sm focus:border-teal focus:outline-none focus:ring-2 focus:ring-teal/20';

  return (
    <form onSubmit={handleSubmit} className="grid grid-cols-2 gap-3 rounded-[14px] border border-gray-200 bg-gray-50 p-4 sm:grid-cols-4">
      <input type="hidden" name="donorId" value={donorId} />

      <div>
        <label className="mb-1 block text-xs font-semibold text-gray-600">Amount</label>
        <input name="amount" type="number" step="0.01" min="0.01" required className={inputClasses} />
      </div>
      <div>
        <label className="mb-1 block text-xs font-semibold text-gray-600">Date</label>
        <input
          name="date"
          type="date"
          required
          defaultValue={new Date().toISOString().slice(0, 10)}
          className={inputClasses}
        />
      </div>
      <div>
        <label className="mb-1 block text-xs font-semibold text-gray-600">Type</label>
        <select name="giftType" defaultValue={GiftType.ONE_TIME} className={inputClasses}>
          {Object.values(GiftType).map((t) => (
            <option key={t} value={t}>
              {GIFT_TYPE_LABELS[t]}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className="mb-1 block text-xs font-semibold text-gray-600">Payment method</label>
        <select name="paymentMethod" defaultValue={PaymentMethod.CREDIT_CARD} className={inputClasses}>
          {Object.values(PaymentMethod).map((m) => (
            <option key={m} value={m}>
              {PAYMENT_METHOD_LABELS[m]}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className="mb-1 block text-xs font-semibold text-gray-600">Fund</label>
        <input name="fund" type="text" placeholder="e.g. General" className={inputClasses} />
      </div>
      <div>
        <label className="mb-1 block text-xs font-semibold text-gray-600">Campaign</label>
        <select name="campaignId" defaultValue="" className={inputClasses}>
          <option value="">None</option>
          {campaigns.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </div>
      <div className="col-span-2 sm:col-span-3">
        <label className="mb-1 block text-xs font-semibold text-gray-600">Notes</label>
        <input name="notes" type="text" className={inputClasses} />
      </div>
      <div className="col-span-2 flex items-end sm:col-span-1">
        <SubmitButton pending={isPending}>Log gift</SubmitButton>
      </div>

      {error && (
        <p className="col-span-full rounded-lg bg-red-50 px-3 py-2 text-xs font-medium text-red-600">
          {error}
        </p>
      )}
    </form>
  );
}

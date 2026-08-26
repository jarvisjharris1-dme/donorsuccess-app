'use client';

import { useState, useTransition } from 'react';
import { createSalesAssistedOrderAction } from '@/lib/actions/orders';
import SubmitButton from '@/components/SubmitButton';

export default function CreateOrderForm() {
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const input = 'w-full rounded-[10px] border border-gray-700 bg-gray-800 px-3.5 py-3 text-sm text-white placeholder:text-gray-500 focus:border-evergreen focus:outline-none focus:ring-2 focus:ring-evergreen/30';
  const label = 'mb-1.5 block text-[13px] font-semibold text-gray-300';

  function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const data = new FormData(form);
    setError(null);
    setSuccess(null);
    startTransition(async () => {
      const result = await createSalesAssistedOrderAction(undefined, data);
      if (result?.error) setError(result.error);
      if (result?.success) {
        setSuccess(`${result.success} ${result.orderId ?? ''}`.trim());
        form.reset();
      }
    });
  }

  return (
    <form onSubmit={submit} className="rounded-2xl border border-gray-800 bg-gray-800/40 p-6">
      <div className="mb-5">
        <h2 className="text-[16px] font-bold text-white">Create sales-assisted order</h2>
        <p className="mt-1 text-sm text-gray-400">Create the fulfillment record before signature completion. TurboSign will auto-link the hidden document ID when the webhook arrives.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <label className={label}>Organization name</label>
          <input className={input} name="organizationName" required placeholder="OMG Tennis" />
        </div>
        <div>
          <label className={label}>Owner / primary contact</label>
          <input className={input} name="ownerName" placeholder="Aspen Wooten" />
        </div>
        <div>
          <label className={label}>Owner email</label>
          <input className={input} name="ownerEmail" type="email" required placeholder="aspen@example.org" />
        </div>
        <div>
          <label className={label}>Plan</label>
          <select className={input} name="subscriptionTier" defaultValue="GROWTH">
            <option value="GROWTH">Growth</option>
            <option value="ENTERPRISE">Enterprise</option>
          </select>
        </div>
        <div>
          <label className={label}>Billing period</label>
          <select className={input} name="billingPeriod" defaultValue="annual">
            <option value="annual">Annual</option>
            <option value="monthly">Monthly</option>
          </select>
        </div>
        <div>
          <label className={label}>Annual recurring value ($)</label>
          <input className={input} name="arr" type="number" min="0" step="0.01" placeholder="13000" />
        </div>
        <div>
          <label className={label}>One-time services ($)</label>
          <input className={input} name="oneTime" type="number" min="0" step="0.01" placeholder="0" />
        </div>
        <div>
          <label className={label}>TurboQuote ID</label>
          <input className={input} name="quoteId" placeholder="Q-2026-00002" />
        </div>
        <div>
          <label className={label}>TurboSign document ID <span className="font-normal text-gray-500">(optional)</span></label>
          <input className={input} name="turboSignDocumentId" placeholder="Auto-linked from TurboSign" />
          <p className="mt-1 text-xs text-gray-500">Leave blank for normal use. The webhook will match the signed document to this order by organization name or quote ID, then save the document ID automatically.</p>
        </div>
        <div className="md:col-span-2">
          <label className={label}>Products / modules</label>
          <input className={input} name="products" placeholder="Donor Success Professional, Grants Management" />
          <p className="mt-1 text-xs text-gray-500">Separate multiple products with commas.</p>
        </div>
        <div className="md:col-span-2">
          <label className={label}>Fulfillment notes</label>
          <textarea className={`${input} min-h-24`} name="notes" placeholder="Implementation commitments, special terms, target start date..." />
        </div>
      </div>

      {error && <p className="mt-4 rounded-lg bg-red-500/10 px-3.5 py-2.5 text-sm font-medium text-red-400">{error}</p>}
      {success && <p className="mt-4 rounded-lg bg-emerald-500/10 px-3.5 py-2.5 text-sm font-medium text-emerald-400">{success}</p>}

      <div className="mt-5">
        <SubmitButton pending={isPending}>Create order</SubmitButton>
      </div>
    </form>
  );
}

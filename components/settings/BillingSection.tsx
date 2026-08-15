'use client';

import { useState, useTransition } from 'react';
import { CreditCard } from 'lucide-react';
import { createBillingPortalSessionAction, type ActionState } from '@/lib/actions/billing';

const TIER_LABELS: Record<string, string> = {
  TRIAL: 'Trial',
  STARTER: 'Starter',
  GROWTH: 'Growth',
  ENTERPRISE: 'Enterprise',
};

const STATUS_STYLES: Record<string, string> = {
  active: 'bg-success/10 text-success',
  trialing: 'bg-sky/10 text-sky',
  past_due: 'bg-warning/10 text-warning',
  canceled: 'bg-error/10 text-error',
  unpaid: 'bg-error/10 text-error',
};

export default function BillingSection({
  tier,
  billingPeriod,
  subscriptionStatus,
  isSelfServe,
}: {
  tier: string;
  billingPeriod: string | null;
  subscriptionStatus: string | null;
  isSelfServe: boolean;
}) {
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleManageBilling() {
    setError(null);
    startTransition(async () => {
      const result: ActionState = await createBillingPortalSessionAction(undefined, new FormData());
      if (result?.error) setError(result.error);
    });
  }

  return (
    <div className="rounded-[16px] border border-gray-200 bg-white p-6">
      <div className="flex items-center gap-2">
        <CreditCard size={16} className="text-gray-900" />
        <h2 className="text-[15px] font-bold text-gray-900">Billing</h2>
      </div>

      <div className="mt-4 flex items-center justify-between rounded-xl border border-gray-100 bg-gray-50 p-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-gray-900">{TIER_LABELS[tier] ?? tier}</span>
            {billingPeriod && (
              <span className="text-xs text-gray-500">
                &middot; billed {billingPeriod === 'annual' ? 'annually' : 'monthly'}
              </span>
            )}
          </div>
          {subscriptionStatus && (
            <span
              className={`mt-1.5 inline-block rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                STATUS_STYLES[subscriptionStatus] ?? 'bg-gray-100 text-gray-600'
              }`}
            >
              {subscriptionStatus.replace('_', ' ')}
            </span>
          )}
        </div>

        {isSelfServe ? (
          <button
            type="button"
            onClick={handleManageBilling}
            disabled={isPending}
            className="rounded-xl border border-gray-200 px-4 py-2.5 text-[13.5px] font-semibold text-gray-900 transition-colors hover:border-gray-300 disabled:opacity-60"
          >
            {isPending ? 'Opening…' : 'Manage billing'}
          </button>
        ) : (
          <span className="text-[13px] text-gray-500">Contact your account team to make changes.</span>
        )}
      </div>

      {error && <p className="mt-3 text-xs font-medium text-error">{error}</p>}
    </div>
  );
}

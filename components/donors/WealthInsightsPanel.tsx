'use client';

import { useTransition } from 'react';
import { Gem, RefreshCw } from 'lucide-react';
import { screenDonorWealthAction, type ActionState } from '@/lib/actions/wealth-engine';
import { formatCurrency, formatDateTime } from '@/lib/format';

export type WealthData = {
  wealthEstimatedNetWorth: string | null;
  wealthEstimatedIncome: string | null;
  wealthRealEstateValue: string | null;
  wealthGivingCapacity: string | null;
  wealthP2gScore: number | null;
  wealthScreenedAt: string | null;
};

export default function WealthInsightsPanel({
  donorId,
  wealth,
  isConnected,
  canScreen,
}: {
  donorId: string;
  wealth: WealthData;
  isConnected: boolean;
  canScreen: boolean;
}) {
  const [isPending, startTransition] = useTransition();

  function handleScreen() {
    if (!confirm('Screen this donor with WealthEngine? Each screen has a real per-profile cost.')) {
      return;
    }
    const formData = new FormData();
    formData.set('donorId', donorId);
    startTransition(async () => {
      const result: ActionState = await screenDonorWealthAction(undefined, formData);
      if (result?.error) alert(result.error);
    });
  }

  if (!isConnected) {
    return null; // no point showing an empty panel when there's nothing to connect to
  }

  const hasData = wealth.wealthScreenedAt !== null;

  return (
    <div className="rounded-[16px] border border-gray-200 bg-white p-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Gem size={16} className="text-gray-900" />
          <h2 className="text-[15px] font-bold text-gray-900">Wealth Insights</h2>
        </div>
        {canScreen && (
          <button
            type="button"
            onClick={handleScreen}
            disabled={isPending}
            className="flex items-center gap-1.5 text-[12.5px] font-semibold text-evergreen hover:text-[#0d685f] disabled:opacity-60"
          >
            <RefreshCw size={13} className={isPending ? 'animate-spin' : ''} />
            {isPending ? 'Screening…' : hasData ? 'Re-screen' : 'Screen Now'}
          </button>
        )}
      </div>

      {!hasData ? (
        <p className="mt-3 text-sm text-gray-600">
          Not yet screened{canScreen ? ' — click Screen Now to pull wealth data for this donor.' : '.'}
        </p>
      ) : (
        <>
          <div className="mt-4 grid grid-cols-2 gap-3">
            <WealthStat label="Est. net worth" value={wealth.wealthEstimatedNetWorth} />
            <WealthStat label="Est. income" value={wealth.wealthEstimatedIncome} />
            <WealthStat label="Real estate value" value={wealth.wealthRealEstateValue} />
            <WealthStat label="Giving capacity" value={wealth.wealthGivingCapacity} />
          </div>
          {wealth.wealthP2gScore !== null && (
            <div className="mt-3 rounded-xl bg-sky/5 px-3.5 py-2.5 text-sm">
              <span className="font-semibold text-sky">Propensity to Give score: </span>
              <span className="text-gray-900">{wealth.wealthP2gScore}</span>
            </div>
          )}
          <p className="mt-3 text-xs text-gray-500">
            Screened {formatDateTime(wealth.wealthScreenedAt)}
          </p>
        </>
      )}
    </div>
  );
}

function WealthStat({ label, value }: { label: string; value: string | null }) {
  return (
    <div className="rounded-xl bg-gray-50 p-3.5">
      <div className="text-[11px] font-semibold uppercase tracking-wide text-gray-600">{label}</div>
      <div className="mt-1 text-[15px] font-bold text-gray-900">
        {value ? formatCurrency(value) : '—'}
      </div>
    </div>
  );
}

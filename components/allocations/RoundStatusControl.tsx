'use client';

import { useTransition } from 'react';
import { FundingRoundStatus } from '@prisma/client';
import { updateFundingRoundStatusAction } from '@/lib/actions/funding-rounds';
import { FUNDING_ROUND_STATUS_LABELS } from '@/lib/allocations';

const ORDER: FundingRoundStatus[] = ['DRAFT', 'OPEN', 'REVIEWING', 'DECIDED', 'CLOSED'];

export default function RoundStatusControl({ roundId, status }: { roundId: string; status: FundingRoundStatus }) {
  const [isPending, startTransition] = useTransition();
  const currentIndex = ORDER.indexOf(status);

  function advance() {
    const next = ORDER[currentIndex + 1];
    if (!next) return;
    startTransition(() => {
      updateFundingRoundStatusAction(roundId, next);
    });
  }

  if (currentIndex === ORDER.length - 1) return null;

  return (
    <button
      onClick={advance}
      disabled={isPending}
      className="rounded-xl border border-gray-200 px-4 py-2.5 text-[13px] font-semibold text-gray-900 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60"
    >
      {isPending ? 'Updating…' : `Move to ${FUNDING_ROUND_STATUS_LABELS[ORDER[currentIndex + 1]]}`}
    </button>
  );
}

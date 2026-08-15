'use client';

import { useTransition } from 'react';
import Link from 'next/link';
import { OpportunityStage } from '@prisma/client';
import { ORDERED_STAGES, STAGE_LABELS } from '@/lib/pipeline';
import { formatCurrency, formatDate } from '@/lib/format';
import { updateOpportunityStageAction } from '@/lib/actions/opportunities';

export type OpportunityCardData = {
  id: string;
  name: string;
  donorId: string;
  donorName: string;
  stage: OpportunityStage;
  askAmount: string | null;
  expectedCloseDate: string | null;
  ownerName: string;
};

export default function OpportunityCard({ opportunity }: { opportunity: OpportunityCardData }) {
  const [isPending, startTransition] = useTransition();

  function handleStageChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const formData = new FormData();
    formData.set('id', opportunity.id);
    formData.set('stage', e.target.value);
    startTransition(async () => {
      await updateOpportunityStageAction(undefined, formData);
    });
  }

  return (
    <div
      className={`rounded-[14px] border border-gray-200 bg-white p-4 shadow-sm transition-opacity ${isPending ? 'opacity-50' : ''}`}
    >
      <Link href={`/pipeline/${opportunity.id}`} className="block">
        <div className="text-sm font-bold text-gray-900">{opportunity.name}</div>
        <div className="mt-0.5 truncate text-xs text-gray-600">{opportunity.donorName}</div>
      </Link>

      <div className="mt-3 flex items-center justify-between">
        <span className="text-[15px] font-extrabold text-gray-900">
          {opportunity.askAmount ? formatCurrency(opportunity.askAmount) : '—'}
        </span>
        <span className="text-xs text-gray-600">{formatDate(opportunity.expectedCloseDate)}</span>
      </div>

      <div className="mt-1 text-xs text-gray-600">{opportunity.ownerName}</div>

      <select
        value={opportunity.stage}
        onChange={handleStageChange}
        disabled={isPending}
        className="mt-3 w-full rounded-lg border border-gray-200 bg-gray-50 px-2 py-1.5 text-xs font-semibold text-gray-900 focus:border-teal focus:outline-none"
      >
        {ORDERED_STAGES.map((s) => (
          <option key={s} value={s}>
            Move to: {STAGE_LABELS[s]}
          </option>
        ))}
      </select>
    </div>
  );
}

'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Plus } from 'lucide-react';
import { OpportunityStage } from '@prisma/client';
import InlineOpportunityForm from './InlineOpportunityForm';
import StageBadge from '@/components/pipeline/StageBadge';
import { formatCurrency } from '@/lib/format';

export type OpportunityRow = {
  id: string;
  name: string;
  stage: OpportunityStage;
  askAmount: string | null;
};

export default function OpportunitiesPanel({
  donorId,
  opportunities,
  users,
}: {
  donorId: string;
  opportunities: OpportunityRow[];
  users: { id: string; name: string | null; email: string }[];
}) {
  const [showForm, setShowForm] = useState(false);

  return (
    <div className="rounded-[16px] border border-gray-200 bg-white p-6">
      <div className="flex items-center justify-between">
        <h2 className="text-[15px] font-bold text-gray-900">Opportunities</h2>
        <button
          onClick={() => setShowForm((v) => !v)}
          className="flex items-center gap-1.5 text-[13px] font-semibold text-evergreen"
        >
          <Plus size={15} />
          {showForm ? 'Cancel' : 'Add opportunity'}
        </button>
      </div>

      {showForm && (
        <div className="mt-4">
          <InlineOpportunityForm donorId={donorId} users={users} onDone={() => setShowForm(false)} />
        </div>
      )}

      <div className="mt-4 flex flex-col gap-2.5">
        {opportunities.length === 0 && (
          <p className="py-4 text-sm text-gray-600">No major gift opportunities yet.</p>
        )}
        {opportunities.map((o) => (
          <Link
            key={o.id}
            href={`/pipeline/${o.id}`}
            className="flex items-center justify-between rounded-lg bg-gray-50 px-3.5 py-2.5 transition-colors hover:bg-gray-100"
          >
            <span className="text-sm font-medium text-gray-900">{o.name}</span>
            <div className="flex items-center gap-2.5">
              {o.askAmount && (
                <span className="text-xs font-semibold text-gray-600">
                  {formatCurrency(o.askAmount)}
                </span>
              )}
              <StageBadge stage={o.stage} />
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}

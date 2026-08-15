import Link from 'next/link';
import { Target, Plus } from 'lucide-react';
import { FrameworkStage, PlanStatus } from '@prisma/client';
import StageBadge from './StageBadge';
import PlanStatusBadge from './PlanStatusBadge';
import { formatCurrency, formatDate } from '@/lib/format';

export type PlanSummary = {
  id: string;
  title: string;
  stage: FrameworkStage;
  status: PlanStatus;
  objective: string | null;
  targetAskAmount: string | null;
  targetGiftDate: string | null;
  milestoneTotal: number;
  milestoneDone: number;
};

export default function SuccessPlanSummaryCard({
  donorId,
  plan,
  canCreate,
}: {
  donorId: string;
  plan: PlanSummary | null;
  canCreate: boolean;
}) {
  if (!plan) {
    return (
      <div className="rounded-[16px] border border-dashed border-gray-300 bg-gray-50 p-6 text-center">
        <Target size={22} className="mx-auto text-gray-400" />
        <p className="mt-2 text-sm font-medium text-gray-600">No active success plan yet.</p>
        {canCreate && (
          <Link
            href={`/donors/${donorId}/plan/new`}
            className="mt-3 inline-flex items-center gap-1.5 text-[13px] font-semibold text-evergreen"
          >
            <Plus size={14} />
            Create a Success Plan
          </Link>
        )}
      </div>
    );
  }

  return (
    <Link
      href={`/donors/${donorId}/plan/${plan.id}`}
      className="block rounded-[16px] border border-gray-200 bg-white p-6 transition-all hover:-translate-y-0.5 hover:shadow-card"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-gray-900">
          <Target size={16} />
          <h2 className="text-[15px] font-bold">Success Plan</h2>
        </div>
        <PlanStatusBadge status={plan.status} />
      </div>

      <h3 className="mt-3 text-[16px] font-bold text-gray-900">{plan.title}</h3>
      {plan.objective && (
        <p className="mt-1 line-clamp-2 text-sm text-gray-600">{plan.objective}</p>
      )}

      <div className="mt-3 flex flex-wrap items-center gap-2.5">
        <StageBadge stage={plan.stage} />
        {plan.targetAskAmount && (
          <span className="text-xs font-semibold text-gray-600">
            Target: {formatCurrency(plan.targetAskAmount)}
            {plan.targetGiftDate && ` by ${formatDate(plan.targetGiftDate)}`}
          </span>
        )}
      </div>

      {plan.milestoneTotal > 0 && (
        <div className="mt-4">
          <div className="mb-1.5 flex items-center justify-between text-xs font-medium text-gray-600">
            <span>Milestones</span>
            <span>
              {plan.milestoneDone} of {plan.milestoneTotal}
            </span>
          </div>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-gray-100">
            <div
              className="h-full rounded-full bg-gradient-to-r from-teal to-evergreen"
              style={{
                width: `${plan.milestoneTotal ? Math.round((plan.milestoneDone / plan.milestoneTotal) * 100) : 0}%`,
              }}
            />
          </div>
        </div>
      )}
    </Link>
  );
}

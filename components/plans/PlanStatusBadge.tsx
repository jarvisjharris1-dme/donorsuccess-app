import { PlanStatus } from '@prisma/client';
import { PLAN_STATUS_LABELS, PLAN_STATUS_STYLES } from '@/lib/success-plans';

export default function PlanStatusBadge({ status }: { status: PlanStatus }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-semibold ${PLAN_STATUS_STYLES[status]}`}
    >
      {PLAN_STATUS_LABELS[status]}
    </span>
  );
}

import { FrameworkStage } from '@prisma/client';
import { STAGE_LABELS, STAGE_STYLES } from '@/lib/success-plans';

export default function StageBadge({ stage }: { stage: FrameworkStage }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-semibold ${STAGE_STYLES[stage]}`}
    >
      {STAGE_LABELS[stage]}
    </span>
  );
}

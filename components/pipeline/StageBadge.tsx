import { OpportunityStage } from '@prisma/client';
import { STAGE_LABELS, STAGE_STYLES } from '@/lib/pipeline';

export default function StageBadge({ stage }: { stage: OpportunityStage }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-semibold ${STAGE_STYLES[stage]}`}
    >
      {STAGE_LABELS[stage]}
    </span>
  );
}

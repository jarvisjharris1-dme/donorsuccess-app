import { CampaignStatus } from '@prisma/client';
import { STATUS_LABELS, STATUS_STYLES } from '@/lib/campaigns';

export default function StatusBadge({ status }: { status: CampaignStatus }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-semibold ${STATUS_STYLES[status]}`}
    >
      {STATUS_LABELS[status]}
    </span>
  );
}

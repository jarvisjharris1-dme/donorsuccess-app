import { EngagementStyle } from '@prisma/client';
import { ENGAGEMENT_STYLE_LABELS, ENGAGEMENT_STYLE_STYLES } from '@/lib/engagement-style';

export default function EngagementStyleBadge({ style }: { style: EngagementStyle }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-semibold ${ENGAGEMENT_STYLE_STYLES[style]}`}
    >
      {ENGAGEMENT_STYLE_LABELS[style]}
    </span>
  );
}

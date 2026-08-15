import { DonorSegment } from '@prisma/client';
import { SEGMENT_LABELS, SEGMENT_STYLES } from '@/lib/segments';

export default function SegmentBadge({ segment }: { segment: DonorSegment }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-semibold ${SEGMENT_STYLES[segment]}`}
    >
      {SEGMENT_LABELS[segment]}
    </span>
  );
}

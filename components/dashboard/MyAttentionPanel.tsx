import Link from 'next/link';
import { AlertTriangle } from 'lucide-react';
import { RetentionRiskBadge } from '@/components/donors/Badges';
import { formatDate } from '@/lib/format';
import type { RetentionRisk } from '@prisma/client';

export type AttentionDonor = {
  id: string;
  name: string;
  retentionRisk: RetentionRisk;
  lastGiftDate: string | null;
};

export default function MyAttentionPanel({ donors }: { donors: AttentionDonor[] }) {
  // Hidden entirely rather than an empty-state message — a dashboard
  // that's all "nothing to see here" panels stacked up is worse than
  // one that only shows what's actually actionable.
  if (donors.length === 0) return null;

  return (
    <div className="rounded-[16px] border border-gray-200 bg-white p-6">
      <div className="flex items-center gap-2">
        <AlertTriangle size={16} className="text-warning" />
        <h2 className="text-[15px] font-bold text-gray-900">Needs your attention</h2>
      </div>
      <p className="mt-1 text-sm text-gray-600">
        Your assigned donors at the highest risk of lapsing.
      </p>

      <div className="mt-4 flex flex-col gap-1">
        {donors.map((d) => (
          <Link
            key={d.id}
            href={`/donors/${d.id}`}
            className="flex items-center justify-between rounded-xl px-3 py-2.5 transition-colors hover:bg-gray-50"
          >
            <div className="min-w-0">
              <div className="truncate text-sm font-semibold text-gray-900">{d.name}</div>
              <div className="text-xs text-gray-600">Last gift {formatDate(d.lastGiftDate)}</div>
            </div>
            <RetentionRiskBadge risk={d.retentionRisk} />
          </Link>
        ))}
      </div>
    </div>
  );
}

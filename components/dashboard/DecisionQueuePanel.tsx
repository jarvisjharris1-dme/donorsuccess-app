import Link from 'next/link';
import { ListChecks } from 'lucide-react';
import type { DecisionQueueItem } from '@/lib/dashboard/decision-queue';

export default function DecisionQueuePanel({ items }: { items: DecisionQueueItem[] }) {
  if (items.length === 0) return null;

  return (
    <div className="rounded-[16px] border border-gray-200 bg-white p-6">
      <div className="flex items-center gap-2">
        <ListChecks size={16} className="text-gray-900" />
        <h2 className="text-[15px] font-bold text-gray-900">Decision Queue</h2>
      </div>
      <div className="mt-3 flex flex-col divide-y divide-gray-50">
        {items.map((item) => (
          <Link
            key={item.id}
            href={item.href}
            className="flex items-center justify-between gap-3 py-2.5 hover:bg-gray-50"
          >
            <div className="min-w-0">
              <p className="truncate text-[14px] font-medium text-gray-900">{item.label}</p>
              <p className="text-xs text-gray-500">{item.detail}</p>
            </div>
            <span
              className={`flex-shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                item.severity === 'high' ? 'bg-error/10 text-error' : 'bg-warning/10 text-warning'
              }`}
            >
              {item.severity === 'high' ? 'High' : 'Medium'}
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}

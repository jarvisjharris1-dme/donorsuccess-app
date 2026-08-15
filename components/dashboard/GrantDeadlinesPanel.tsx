import Link from 'next/link';
import { FileWarning } from 'lucide-react';

export type GrantDeadlineItem = {
  grantId: string;
  label: string;
  detail: string;
  severity: 'overdue' | 'soon' | 'normal';
};

const SEVERITY_STYLES: Record<GrantDeadlineItem['severity'], string> = {
  overdue: 'bg-error text-white',
  soon: 'bg-warning/10 text-warning',
  normal: '',
};

const SEVERITY_LABELS: Record<GrantDeadlineItem['severity'], string> = {
  overdue: 'Overdue',
  soon: 'Due soon',
  normal: '',
};

export default function GrantDeadlinesPanel({ items }: { items: GrantDeadlineItem[] }) {
  if (items.length === 0) return null;

  return (
    <div className="rounded-[16px] border border-gray-200 bg-white p-6">
      <div className="flex items-center gap-2">
        <FileWarning size={16} className="text-gray-900" />
        <h2 className="text-[15px] font-bold text-gray-900">Grant deadlines</h2>
      </div>
      <p className="mt-1 text-sm text-gray-600">Across every grant you write or manage compliance for.</p>

      <div className="mt-4 flex flex-col divide-y divide-gray-50">
        {items.map((item, i) => (
          <Link
            key={i}
            href={`/grants/${item.grantId}`}
            className="flex items-center justify-between gap-3 py-3 transition-colors hover:bg-gray-50"
          >
            <div className="min-w-0">
              <div className="truncate text-[14px] font-semibold text-gray-900">{item.label}</div>
              <div
                className={`mt-0.5 text-xs ${
                  item.severity === 'overdue' ? 'text-error' : item.severity === 'soon' ? 'text-warning' : 'text-gray-600'
                }`}
              >
                {item.detail}
              </div>
            </div>
            {item.severity !== 'normal' && (
              <span
                className={`flex-shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold ${SEVERITY_STYLES[item.severity]}`}
              >
                {SEVERITY_LABELS[item.severity]}
              </span>
            )}
          </Link>
        ))}
      </div>
    </div>
  );
}

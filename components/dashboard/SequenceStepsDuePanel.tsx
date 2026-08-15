import Link from 'next/link';
import { Route } from 'lucide-react';

export type DueSequenceStep = {
  enrollmentId: string;
  donorId: string;
  donorName: string;
  sequenceName: string;
  stepTemplateName: string;
  isOverdue: boolean;
};

export default function SequenceStepsDuePanel({ steps }: { steps: DueSequenceStep[] }) {
  if (steps.length === 0) return null;

  return (
    <div className="rounded-[16px] border border-gray-200 bg-white p-6">
      <div className="flex items-center gap-2">
        <Route size={16} className="text-gray-900" />
        <h2 className="text-[15px] font-bold text-gray-900">Sequence steps due</h2>
      </div>
      <p className="mt-1 text-sm text-gray-600">
        Queued stewardship emails ready to review and send — nothing sends without you.
      </p>

      <div className="mt-4 flex flex-col divide-y divide-gray-50">
        {steps.map((s) => (
          <Link
            key={s.enrollmentId}
            href={`/donors/${s.donorId}`}
            className="flex items-center justify-between gap-3 py-3 transition-colors hover:bg-gray-50"
          >
            <div className="min-w-0">
              <div className="text-[14px] font-semibold text-gray-900">{s.donorName}</div>
              <div className="mt-0.5 text-xs text-gray-600">
                {s.sequenceName} &middot; {s.stepTemplateName}
              </div>
            </div>
            {s.isOverdue && (
              <span className="flex-shrink-0 rounded-full bg-error/10 px-2.5 py-1 text-[11px] font-semibold text-error">
                Overdue
              </span>
            )}
          </Link>
        ))}
      </div>
    </div>
  );
}

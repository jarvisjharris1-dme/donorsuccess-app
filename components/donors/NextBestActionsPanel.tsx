import { Sparkles } from 'lucide-react';
import type { NextBestAction } from '@/lib/insights/next-best-actions';

const PRIORITY_DOT: Record<NextBestAction['priority'], string> = {
  high: 'bg-error',
  medium: 'bg-warning',
  low: 'bg-gray-300',
};

export default function NextBestActionsPanel({ actions }: { actions: NextBestAction[] }) {
  return (
    <div className="rounded-[16px] border border-gray-200 bg-white p-6">
      <div className="flex items-center gap-2.5">
        <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-sky to-evergreen">
          <Sparkles size={14} className="text-white" />
        </div>
        <h2 className="text-[15px] font-bold text-gray-900">Next Best Actions</h2>
      </div>

      {actions.length === 0 ? (
        <p className="mt-3 text-sm text-gray-600">
          Nothing urgent — this relationship looks steady right now.
        </p>
      ) : (
        <div className="mt-4 flex flex-col gap-3">
          {actions.map((a) => (
            <div key={a.id} className="flex items-start gap-2.5">
              <span
                className={`mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full ${PRIORITY_DOT[a.priority]}`}
              />
              <p className="text-[13.5px] leading-snug text-gray-900">{a.text}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

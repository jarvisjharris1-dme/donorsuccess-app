import Link from 'next/link';
import { CheckSquare, ArrowRight } from 'lucide-react';
import PriorityBadge from '@/components/tasks/PriorityBadge';
import { formatDate } from '@/lib/format';
import { TaskPriority } from '@prisma/client';

export type UpcomingTask = {
  id: string;
  title: string;
  dueDate: string | null;
  priority: TaskPriority;
  donorName: string | null;
};

export default function UpcomingTasksPanel({ tasks }: { tasks: UpcomingTask[] }) {
  return (
    <div className="fade-up rounded-[16px] border border-gray-200 bg-white p-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-gray-900">
          <CheckSquare size={16} />
          <h2 className="text-[15px] font-bold">Your upcoming tasks</h2>
        </div>
        <Link
          href="/tasks"
          className="flex items-center gap-1 text-[13px] font-semibold text-evergreen hover:text-[#0d685f]"
        >
          View all
          <ArrowRight size={14} />
        </Link>
      </div>

      <div className="mt-3 flex flex-col divide-y divide-gray-50">
        {tasks.length === 0 && (
          <p className="py-6 text-center text-sm text-gray-600">
            Nothing on your plate right now.
          </p>
        )}
        {tasks.map((t) => (
          <div key={t.id} className="flex items-center justify-between gap-3 py-3">
            <div className="min-w-0">
              <div className="truncate text-sm font-medium text-gray-900">{t.title}</div>
              {t.donorName && <div className="mt-0.5 text-xs text-gray-600">{t.donorName}</div>}
            </div>
            <div className="flex flex-shrink-0 items-center gap-2.5">
              <PriorityBadge priority={t.priority} />
              <span className="text-xs font-medium text-gray-600">{formatDate(t.dueDate)}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

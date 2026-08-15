import { TaskPriority } from '@prisma/client';

const STYLES: Record<TaskPriority, string> = {
  LOW: 'bg-gray-100 text-gray-600',
  MEDIUM: 'bg-sky/10 text-sky',
  HIGH: 'bg-error/10 text-error',
};

export default function PriorityBadge({ priority }: { priority: TaskPriority }) {
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-semibold capitalize ${STYLES[priority]}`}>
      {priority.toLowerCase()}
    </span>
  );
}

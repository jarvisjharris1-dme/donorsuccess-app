'use client';

import { useTransition } from 'react';
import Link from 'next/link';
import { Check, Trash2 } from 'lucide-react';
import { TaskPriority, TaskStatus } from '@prisma/client';
import PriorityBadge from './PriorityBadge';
import { formatDate } from '@/lib/format';
import { toggleTaskStatusAction, deleteTaskAction } from '@/lib/actions/tasks';

export type TaskRowData = {
  id: string;
  title: string;
  status: TaskStatus;
  priority: TaskPriority;
  dueDate: string | null;
  assigneeName: string;
  donorId?: string | null;
  donorName?: string | null;
  opportunityId?: string | null;
  opportunityName?: string | null;
  grantOpportunityId?: string | null;
  grantOpportunityName?: string | null;
};

export default function TaskRow({
  task,
  showContext = true,
  canDelete = false,
}: {
  task: TaskRowData;
  showContext?: boolean;
  canDelete?: boolean;
}) {
  const [isPending, startTransition] = useTransition();
  const isDone = task.status === TaskStatus.DONE;

  const isOverdue =
    !isDone && !!task.dueDate && new Date(task.dueDate) < new Date(new Date().toDateString());

  function toggle() {
    const formData = new FormData();
    formData.set('id', task.id);
    formData.set('status', isDone ? TaskStatus.OPEN : TaskStatus.DONE);
    startTransition(async () => {
      await toggleTaskStatusAction(undefined, formData);
    });
  }

  function handleDelete() {
    if (!confirm('Delete this task?')) return;
    const formData = new FormData();
    formData.set('id', task.id);
    startTransition(async () => {
      await deleteTaskAction(undefined, formData);
    });
  }

  return (
    <div
      className={`flex flex-wrap items-center gap-x-3 gap-y-1.5 rounded-lg px-3.5 py-3 transition-opacity hover:bg-gray-50 ${isPending ? 'opacity-50' : ''}`}
    >
      <button
        type="button"
        onClick={toggle}
        disabled={isPending}
        aria-label={isDone ? 'Mark as open' : 'Mark as done'}
        className={`flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full border-2 transition-colors ${
          isDone ? 'border-success bg-success' : 'border-gray-300 hover:border-evergreen'
        }`}
      >
        {isDone && <Check size={12} className="text-white" />}
      </button>

      <div className="min-w-0 flex-1">
        <div className={`text-sm font-medium ${isDone ? 'text-gray-400 line-through' : 'text-gray-900'}`}>
          {task.title}
        </div>
        {showContext && (task.donorName || task.opportunityName || task.grantOpportunityName) && (
          <div className="mt-0.5 flex gap-2 text-xs text-gray-600">
            {task.donorId && task.donorName && (
              <Link href={`/donors/${task.donorId}`} className="hover:text-evergreen">
                {task.donorName}
              </Link>
            )}
            {task.opportunityId && task.opportunityName && (
              <Link href={`/pipeline/${task.opportunityId}`} className="hover:text-evergreen">
                {task.opportunityName}
              </Link>
            )}
            {task.grantOpportunityId && task.grantOpportunityName && (
              <Link href={`/grants/${task.grantOpportunityId}`} className="hover:text-evergreen">
                {task.grantOpportunityName}
              </Link>
            )}
          </div>
        )}
      </div>

      <PriorityBadge priority={task.priority} />

      <span
        className={`flex-shrink-0 text-xs font-medium ${isOverdue ? 'text-error' : 'text-gray-600'}`}
      >
        {formatDate(task.dueDate)}
      </span>

      <span className="flex-shrink-0 truncate text-xs text-gray-600">{task.assigneeName}</span>

      {canDelete && (
        <button
          type="button"
          onClick={handleDelete}
          disabled={isPending}
          className="flex-shrink-0 text-gray-400 transition-colors hover:text-error"
        >
          <Trash2 size={14} />
        </button>
      )}
    </div>
  );
}

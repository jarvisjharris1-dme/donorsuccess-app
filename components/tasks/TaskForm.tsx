'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { TaskPriority, TaskStatus } from '@prisma/client';
import SubmitButton from '@/components/SubmitButton';
import { toDateInputValue } from '@/lib/format';
import { saveTaskAction, type ActionState } from '@/lib/actions/tasks';

type TaskFormValues = {
  id?: string;
  title: string;
  description?: string | null;
  dueDate?: Date | string | null;
  priority: TaskPriority;
  status: TaskStatus;
  assignedToId: string;
  donorId?: string | null;
  opportunityId?: string | null;
  grantOpportunityId?: string | null;
};

export default function TaskForm({
  task,
  users,
  donors,
  opportunities,
  grants,
  currentUserId,
}: {
  task?: TaskFormValues;
  users: { id: string; name: string | null; email: string }[];
  donors: { id: string; name: string }[];
  opportunities: { id: string; name: string }[];
  grants: { id: string; name: string }[];
  currentUserId: string;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    setError(null);
    startTransition(async () => {
      const result: ActionState = await saveTaskAction(undefined, formData);
      if (result?.error) {
        setError(result.error);
      } else {
        // saveTaskAction doesn't redirect (see its doc comment) — the
        // standalone page navigates back to the list itself on success.
        router.push('/tasks');
      }
    });
  }

  const inputClasses =
    'w-full rounded-[10px] border border-gray-200 px-3.5 py-3 text-sm focus:border-teal focus:outline-none focus:ring-2 focus:ring-teal/20';
  const labelClasses = 'mb-1.5 block text-[13px] font-semibold text-gray-900';

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6">
      {task?.id && <input type="hidden" name="id" value={task.id} />}

      <div className="rounded-[16px] border border-gray-200 p-5">
        <h3 className="mb-4 text-[13px] font-bold uppercase tracking-wide text-gray-600">Task</h3>
        <div className="grid grid-cols-1 gap-4">
          <div>
            <label htmlFor="title" className={labelClasses}>
              Title
            </label>
            <input
              id="title"
              name="title"
              type="text"
              required
              defaultValue={task?.title ?? ''}
              className={inputClasses}
            />
          </div>
          <div>
            <label htmlFor="description" className={labelClasses}>
              Description
            </label>
            <textarea
              id="description"
              name="description"
              rows={3}
              defaultValue={task?.description ?? ''}
              className={`${inputClasses} resize-y`}
            />
          </div>
        </div>
      </div>

      <div className="rounded-[16px] border border-gray-200 p-5">
        <h3 className="mb-4 text-[13px] font-bold uppercase tracking-wide text-gray-600">
          Scheduling
        </h3>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <div>
            <label htmlFor="dueDate" className={labelClasses}>
              Due date
            </label>
            <input
              id="dueDate"
              name="dueDate"
              type="date"
              defaultValue={toDateInputValue(task?.dueDate)}
              className={inputClasses}
            />
          </div>
          <div>
            <label htmlFor="priority" className={labelClasses}>
              Priority
            </label>
            <select
              id="priority"
              name="priority"
              defaultValue={task?.priority ?? TaskPriority.MEDIUM}
              className={inputClasses}
            >
              {Object.values(TaskPriority).map((p) => (
                <option key={p} value={p}>
                  {p.charAt(0) + p.slice(1).toLowerCase()}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="status" className={labelClasses}>
              Status
            </label>
            <select
              id="status"
              name="status"
              defaultValue={task?.status ?? TaskStatus.OPEN}
              className={inputClasses}
            >
              {Object.values(TaskStatus).map((s) => (
                <option key={s} value={s}>
                  {s.charAt(0) + s.slice(1).toLowerCase().replace('_', ' ')}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="assignedToId" className={labelClasses}>
              Assign to
            </label>
            <select
              id="assignedToId"
              name="assignedToId"
              defaultValue={task?.assignedToId ?? currentUserId}
              className={inputClasses}
            >
              {users.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name ?? u.email}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className="rounded-[16px] border border-gray-200 p-5">
        <h3 className="mb-4 text-[13px] font-bold uppercase tracking-wide text-gray-600">
          Related to (optional)
        </h3>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div>
            <label htmlFor="donorId" className={labelClasses}>
              Donor
            </label>
            <select
              id="donorId"
              name="donorId"
              defaultValue={task?.donorId ?? ''}
              className={inputClasses}
            >
              <option value="">None</option>
              {donors.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="opportunityId" className={labelClasses}>
              Opportunity
            </label>
            <select
              id="opportunityId"
              name="opportunityId"
              defaultValue={task?.opportunityId ?? ''}
              className={inputClasses}
            >
              <option value="">None</option>
              {opportunities.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="grantOpportunityId" className={labelClasses}>
              Grant
            </label>
            <select
              id="grantOpportunityId"
              name="grantOpportunityId"
              defaultValue={task?.grantOpportunityId ?? ''}
              className={inputClasses}
            >
              <option value="">None</option>
              {grants.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {error && (
        <p className="rounded-lg bg-red-50 px-3.5 py-2.5 text-sm font-medium text-red-600">
          {error}
        </p>
      )}

      <div className="flex gap-3">
        <SubmitButton pending={isPending}>{task?.id ? 'Save changes' : 'Create task'}</SubmitButton>
        <button
          type="button"
          onClick={() => router.back()}
          className="rounded-xl border border-gray-200 px-6 py-3.5 text-[15px] font-semibold text-gray-600 transition-colors hover:border-gray-300"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}

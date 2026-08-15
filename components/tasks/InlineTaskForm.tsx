'use client';

import { useState, useTransition } from 'react';
import { TaskPriority, TaskStatus } from '@prisma/client';
import SubmitButton from '@/components/SubmitButton';
import { saveTaskAction, type ActionState } from '@/lib/actions/tasks';

export default function InlineTaskForm({
  donorId,
  opportunityId,
  grantOpportunityId,
  users,
  currentUserId,
  onDone,
}: {
  donorId?: string;
  opportunityId?: string;
  grantOpportunityId?: string;
  users: { id: string; name: string | null; email: string }[];
  currentUserId: string;
  onDone?: () => void;
}) {
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const formData = new FormData(form);
    setError(null);
    startTransition(async () => {
      const result: ActionState = await saveTaskAction(undefined, formData);
      if (result?.error) {
        setError(result.error);
      } else {
        form.reset();
        onDone?.();
      }
    });
  }

  const inputClasses =
    'w-full rounded-[10px] border border-gray-200 px-3 py-2.5 text-sm focus:border-teal focus:outline-none focus:ring-2 focus:ring-teal/20';

  return (
    <form
      onSubmit={handleSubmit}
      className="grid grid-cols-2 gap-3 rounded-[14px] border border-gray-200 bg-gray-50 p-4 sm:grid-cols-4"
    >
      <input type="hidden" name="status" value={TaskStatus.OPEN} />
      {donorId && <input type="hidden" name="donorId" value={donorId} />}
      {opportunityId && <input type="hidden" name="opportunityId" value={opportunityId} />}
      {grantOpportunityId && <input type="hidden" name="grantOpportunityId" value={grantOpportunityId} />}

      <div className="col-span-2">
        <label className="mb-1 block text-xs font-semibold text-gray-600">Title</label>
        <input name="title" type="text" required placeholder="e.g. Send thank-you letter" className={inputClasses} />
      </div>
      <div>
        <label className="mb-1 block text-xs font-semibold text-gray-600">Due date</label>
        <input name="dueDate" type="date" className={inputClasses} />
      </div>
      <div>
        <label className="mb-1 block text-xs font-semibold text-gray-600">Priority</label>
        <select name="priority" defaultValue={TaskPriority.MEDIUM} className={inputClasses}>
          {Object.values(TaskPriority).map((p) => (
            <option key={p} value={p}>
              {p.charAt(0) + p.slice(1).toLowerCase()}
            </option>
          ))}
        </select>
      </div>
      <div className="col-span-2 sm:col-span-2">
        <label className="mb-1 block text-xs font-semibold text-gray-600">Assign to</label>
        <select name="assignedToId" defaultValue={currentUserId} className={inputClasses}>
          {users.map((u) => (
            <option key={u.id} value={u.id}>
              {u.name ?? u.email}
            </option>
          ))}
        </select>
      </div>
      <div className="col-span-2 flex items-end sm:col-span-2">
        <SubmitButton pending={isPending}>Add task</SubmitButton>
      </div>

      {error && (
        <p className="col-span-full rounded-lg bg-red-50 px-3 py-2 text-xs font-medium text-red-600">
          {error}
        </p>
      )}
    </form>
  );
}

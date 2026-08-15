'use client';

import { useState, useTransition } from 'react';
import { Plus, Trash2, Pencil } from 'lucide-react';
import { MilestoneStatus, TaskPriority, MilestoneCategory } from '@prisma/client';
import SubmitButton from '@/components/SubmitButton';
import PriorityBadge from '@/components/tasks/PriorityBadge';
import { formatDate } from '@/lib/format';
import {
  MILESTONE_STATUSES,
  MILESTONE_STATUS_LABELS,
  MILESTONE_STATUS_STYLES,
  MILESTONE_CATEGORIES,
  MILESTONE_CATEGORY_LABELS,
} from '@/lib/success-plans';
import {
  addMilestoneAction,
  updateMilestoneAction,
  toggleMilestoneAction,
  deleteMilestoneAction,
  type ActionState,
} from '@/lib/actions/milestones';

export type MilestoneRow = {
  id: string;
  title: string;
  status: MilestoneStatus;
  priority: TaskPriority;
  category: MilestoneCategory;
  dueDate: string | null;
  notes: string | null;
  ownerId: string | null;
  ownerName: string | null;
};

export default function MilestonesPanel({
  planId,
  donorId,
  milestones,
  users,
  canDelete,
}: {
  planId: string;
  donorId: string;
  milestones: MilestoneRow[];
  users: { id: string; name: string | null; email: string }[];
  canDelete: boolean;
}) {
  const [showForm, setShowForm] = useState(false);
  const doneCount = milestones.filter((m) => m.status === MilestoneStatus.DONE).length;

  return (
    <div className="rounded-[16px] border border-gray-200 bg-white p-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-[15px] font-bold text-gray-900">Milestones</h2>
          {milestones.length > 0 && (
            <p className="mt-0.5 text-xs text-gray-600">
              {doneCount} of {milestones.length} complete
            </p>
          )}
        </div>
        <button
          onClick={() => setShowForm((v) => !v)}
          className="flex items-center gap-1.5 text-[13px] font-semibold text-evergreen"
        >
          <Plus size={15} />
          {showForm ? 'Cancel' : 'Add milestone'}
        </button>
      </div>

      {showForm && (
        <div className="mt-4">
          <MilestoneForm
            mode="add"
            planId={planId}
            donorId={donorId}
            users={users}
            onDone={() => setShowForm(false)}
          />
        </div>
      )}

      <div className="mt-3 flex flex-col divide-y divide-gray-50">
        {milestones.length === 0 && (
          <p className="py-4 text-sm text-gray-600">No milestones yet.</p>
        )}
        {milestones.map((m) => (
          <MilestoneRowItem
            key={m.id}
            milestone={m}
            donorId={donorId}
            users={users}
            canDelete={canDelete}
          />
        ))}
      </div>
    </div>
  );
}

function MilestoneForm({
  mode,
  planId,
  donorId,
  users,
  milestone,
  onDone,
}: {
  mode: 'add' | 'edit';
  planId?: string;
  donorId: string;
  users: { id: string; name: string | null; email: string }[];
  milestone?: MilestoneRow;
  onDone: () => void;
}) {
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const formData = new FormData(form);
    setError(null);
    startTransition(async () => {
      const action = mode === 'add' ? addMilestoneAction : updateMilestoneAction;
      const result: ActionState = await action(undefined, formData);
      if (result?.error) {
        setError(result.error);
      } else {
        if (mode === 'add') form.reset();
        onDone();
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
      {mode === 'add' && <input type="hidden" name="planId" value={planId} />}
      {mode === 'edit' && <input type="hidden" name="id" value={milestone!.id} />}
      <input type="hidden" name="donorId" value={donorId} />

      <div className="col-span-2 sm:col-span-2">
        <label className="mb-1 block text-xs font-semibold text-gray-600">Title</label>
        <input
          name="title"
          type="text"
          required
          defaultValue={milestone?.title}
          placeholder="e.g. Schedule site visit"
          className={inputClasses}
        />
      </div>
      <div>
        <label className="mb-1 block text-xs font-semibold text-gray-600">Due date</label>
        <input name="dueDate" type="date" defaultValue={milestone?.dueDate?.slice(0, 10)} className={inputClasses} />
      </div>
      <div>
        <label className="mb-1 block text-xs font-semibold text-gray-600">Priority</label>
        <select name="priority" defaultValue={milestone?.priority ?? TaskPriority.MEDIUM} className={inputClasses}>
          {Object.values(TaskPriority).map((p) => (
            <option key={p} value={p}>
              {p.charAt(0) + p.slice(1).toLowerCase()}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="mb-1 block text-xs font-semibold text-gray-600">Category</label>
        <select name="category" defaultValue={milestone?.category ?? MilestoneCategory.OTHER} className={inputClasses}>
          {MILESTONE_CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {MILESTONE_CATEGORY_LABELS[c]}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className="mb-1 block text-xs font-semibold text-gray-600">Owner</label>
        <select name="ownerId" defaultValue={milestone?.ownerId ?? ''} className={inputClasses}>
          <option value="">Plan owner</option>
          {users.map((u) => (
            <option key={u.id} value={u.id}>
              {u.name ?? u.email}
            </option>
          ))}
        </select>
      </div>
      <div className="col-span-2 sm:col-span-1">
        <label className="mb-1 block text-xs font-semibold text-gray-600">Notes</label>
        <input name="notes" type="text" defaultValue={milestone?.notes ?? ''} className={inputClasses} />
      </div>

      <div className="col-span-full flex items-center gap-2">
        <SubmitButton pending={isPending}>{mode === 'add' ? 'Add' : 'Save'}</SubmitButton>
        {mode === 'edit' && (
          <button
            type="button"
            onClick={onDone}
            className="rounded-lg border border-gray-200 px-3.5 py-2 text-[13px] font-semibold text-gray-600"
          >
            Cancel
          </button>
        )}
      </div>

      {error && (
        <p className="col-span-full rounded-lg bg-red-50 px-3 py-2 text-xs font-medium text-red-600">
          {error}
        </p>
      )}
    </form>
  );
}

function MilestoneRowItem({
  milestone,
  donorId,
  users,
  canDelete,
}: {
  milestone: MilestoneRow;
  donorId: string;
  users: { id: string; name: string | null; email: string }[];
  canDelete: boolean;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [isPending, startTransition] = useTransition();
  const isDone = milestone.status === MilestoneStatus.DONE;

  function handleStatusChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const formData = new FormData();
    formData.set('id', milestone.id);
    formData.set('donorId', donorId);
    formData.set('status', e.target.value);
    startTransition(async () => {
      await toggleMilestoneAction(undefined, formData);
    });
  }

  function handleDelete() {
    if (!confirm('Delete this milestone?')) return;
    const formData = new FormData();
    formData.set('id', milestone.id);
    formData.set('donorId', donorId);
    startTransition(async () => {
      await deleteMilestoneAction(undefined, formData);
    });
  }

  if (isEditing) {
    return (
      <div className="py-3">
        <MilestoneForm
          mode="edit"
          donorId={donorId}
          users={users}
          milestone={milestone}
          onDone={() => setIsEditing(false)}
        />
      </div>
    );
  }

  return (
    <div className={`flex flex-wrap items-center gap-3 py-3 transition-opacity ${isPending ? 'opacity-50' : ''}`}>
      <select
        value={milestone.status}
        onChange={handleStatusChange}
        disabled={isPending}
        className={`flex-shrink-0 rounded-lg border-0 px-2 py-1 text-[11px] font-semibold ${MILESTONE_STATUS_STYLES[milestone.status]}`}
      >
        {MILESTONE_STATUSES.map((s) => (
          <option key={s} value={s}>
            {MILESTONE_STATUS_LABELS[s]}
          </option>
        ))}
      </select>

      <div className="min-w-[140px] flex-1">
        <div className={`text-sm font-medium ${isDone ? 'text-gray-400 line-through' : 'text-gray-900'}`}>
          {milestone.title}
        </div>
        {milestone.notes && <div className="mt-0.5 text-xs text-gray-600">{milestone.notes}</div>}
      </div>

      <PriorityBadge priority={milestone.priority} />

      <span className="flex-shrink-0 rounded-full bg-gray-100 px-2.5 py-1 text-[11px] font-semibold text-gray-600">
        {MILESTONE_CATEGORY_LABELS[milestone.category]}
      </span>

      <span className="flex-shrink-0 text-xs font-medium text-gray-600">
        {milestone.ownerName ?? 'Plan owner'}
      </span>

      <span className="flex-shrink-0 text-xs font-medium text-gray-600">
        {formatDate(milestone.dueDate)}
      </span>

      <button
        type="button"
        onClick={() => setIsEditing(true)}
        className="flex-shrink-0 text-gray-400 transition-colors hover:text-evergreen"
        aria-label="Edit milestone"
      >
        <Pencil size={14} />
      </button>

      {canDelete && (
        <button
          type="button"
          onClick={handleDelete}
          disabled={isPending}
          className="flex-shrink-0 text-gray-400 transition-colors hover:text-error"
          aria-label="Delete milestone"
        >
          <Trash2 size={14} />
        </button>
      )}
    </div>
  );
}

'use client';

import { useState, useTransition } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import {
  addGrantMilestoneAction,
  toggleGrantMilestoneAction,
  deleteGrantMilestoneAction,
  type ActionState,
} from '@/lib/actions/grants';

export type MilestoneRow = {
  id: string;
  name: string;
  dueDate: string;
  isComplete: boolean;
  completedAt: string | null;
};

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function isOverdue(dueDateIso: string): boolean {
  return new Date(dueDateIso).getTime() < Date.now();
}

export default function GrantMilestonesChecklist({
  grantId,
  grantOpportunityId,
  milestones,
  canEdit,
}: {
  grantId: string;
  grantOpportunityId: string;
  milestones: MilestoneRow[];
  canEdit: boolean;
}) {
  const [showAdd, setShowAdd] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const completeCount = milestones.filter((m) => m.isComplete).length;

  function handleToggle(id: string) {
    const formData = new FormData();
    formData.set('id', id);
    formData.set('grantOpportunityId', grantOpportunityId);
    startTransition(async () => {
      const result: ActionState = await toggleGrantMilestoneAction(undefined, formData);
      if (result?.error) alert(result.error);
    });
  }

  function handleDelete(id: string) {
    if (!confirm('Remove this milestone?')) return;
    const formData = new FormData();
    formData.set('id', id);
    formData.set('grantOpportunityId', grantOpportunityId);
    startTransition(async () => {
      const result: ActionState = await deleteGrantMilestoneAction(undefined, formData);
      if (result?.error) alert(result.error);
    });
  }

  function handleAdd(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    formData.set('grantId', grantId);
    formData.set('grantOpportunityId', grantOpportunityId);
    setError(null);
    startTransition(async () => {
      const result: ActionState = await addGrantMilestoneAction(undefined, formData);
      if (result?.error) setError(result.error);
      else {
        setShowAdd(false);
        (document.getElementById('add-milestone-form') as HTMLFormElement | null)?.reset();
      }
    });
  }

  return (
    <div className="rounded-[16px] border border-gray-200 bg-white p-6">
      <div className="flex items-center justify-between">
        <h2 className="text-[15px] font-bold text-gray-900">Compliance plan</h2>
        <span className="text-[12.5px] text-gray-500">
          {completeCount} of {milestones.length} complete
        </span>
      </div>

      <div className="mt-3 flex flex-col divide-y divide-gray-50">
        {milestones.length === 0 && !showAdd && (
          <p className="py-3 text-sm text-gray-600">No compliance milestones tracked yet.</p>
        )}
        {milestones.map((m) => {
          const overdue = !m.isComplete && isOverdue(m.dueDate);
          return (
            <div
              key={m.id}
              className={`flex items-center gap-3 py-2.5 ${overdue ? '-mx-6 bg-error/5 px-6' : ''}`}
            >
              <button
                type="button"
                onClick={() => handleToggle(m.id)}
                disabled={!canEdit || isPending}
                className={`flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full border ${
                  m.isComplete ? 'border-success bg-success' : overdue ? 'border-error' : 'border-gray-300'
                }`}
                aria-label={m.isComplete ? 'Mark incomplete' : 'Mark complete'}
              >
                {m.isComplete && <span className="h-2 w-2 rounded-full bg-white" />}
              </button>
              <div className="min-w-0 flex-1">
                <p className={`text-[14px] ${m.isComplete ? 'text-gray-400 line-through' : 'text-gray-900'}`}>
                  {m.name}
                </p>
                <p className={`text-xs ${overdue ? 'font-semibold text-error' : 'text-gray-500'}`}>
                  {m.isComplete
                    ? `Completed ${formatDate(m.completedAt ?? m.dueDate)}`
                    : overdue
                      ? `Overdue — was due ${formatDate(m.dueDate)}`
                      : `Due ${formatDate(m.dueDate)}`}
                </p>
              </div>
              {overdue && !m.isComplete && (
                <span className="flex-shrink-0 rounded-full bg-error px-2.5 py-1 text-[11px] font-semibold text-white">
                  Overdue
                </span>
              )}
              {canEdit && (
                <button
                  type="button"
                  onClick={() => handleDelete(m.id)}
                  className="flex-shrink-0 text-gray-400 hover:text-error"
                  aria-label="Remove milestone"
                >
                  <Trash2 size={14} />
                </button>
              )}
            </div>
          );
        })}
      </div>

      {canEdit && (
        <>
          {showAdd ? (
            <form
              id="add-milestone-form"
              onSubmit={handleAdd}
              className="mt-3 flex flex-col gap-2.5 rounded-xl bg-gray-50 p-4"
            >
              <input
                name="name"
                required
                placeholder="Interim report — Year 1"
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-teal focus:outline-none focus:ring-2 focus:ring-teal/20"
              />
              <input
                name="dueDate"
                type="date"
                required
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-teal focus:outline-none focus:ring-2 focus:ring-teal/20"
              />
              {error && <p className="text-xs font-medium text-error">{error}</p>}
              <div className="flex gap-2">
                <button
                  type="submit"
                  disabled={isPending}
                  className="rounded-lg bg-evergreen px-3.5 py-2 text-[13px] font-semibold text-white disabled:opacity-60"
                >
                  Add
                </button>
                <button
                  type="button"
                  onClick={() => setShowAdd(false)}
                  className="rounded-lg border border-gray-200 px-3.5 py-2 text-[13px] font-semibold text-gray-600"
                >
                  Cancel
                </button>
              </div>
            </form>
          ) : (
            <button
              type="button"
              onClick={() => setShowAdd(true)}
              className="mt-3 flex items-center gap-1.5 text-[13px] font-semibold text-evergreen hover:text-[#0d685f]"
            >
              <Plus size={14} />
              Add milestone
            </button>
          )}
        </>
      )}
    </div>
  );
}

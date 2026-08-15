'use client';

import { useState, useTransition } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import {
  addGrantRequirementAction,
  toggleGrantRequirementAction,
  deleteGrantRequirementAction,
  type ActionState,
} from '@/lib/actions/grants';

export type RequirementRow = {
  id: string;
  name: string;
  dueDate: string | null;
  isComplete: boolean;
};

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export default function GrantRequirementsChecklist({
  grantOpportunityId,
  requirements,
  canEdit,
}: {
  grantOpportunityId: string;
  requirements: RequirementRow[];
  canEdit: boolean;
}) {
  const [showAdd, setShowAdd] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const completeCount = requirements.filter((r) => r.isComplete).length;

  function handleToggle(id: string) {
    const formData = new FormData();
    formData.set('id', id);
    formData.set('grantOpportunityId', grantOpportunityId);
    startTransition(async () => {
      const result: ActionState = await toggleGrantRequirementAction(undefined, formData);
      if (result?.error) alert(result.error);
    });
  }

  function handleDelete(id: string) {
    if (!confirm('Remove this requirement?')) return;
    const formData = new FormData();
    formData.set('id', id);
    formData.set('grantOpportunityId', grantOpportunityId);
    startTransition(async () => {
      const result: ActionState = await deleteGrantRequirementAction(undefined, formData);
      if (result?.error) alert(result.error);
    });
  }

  function handleAdd(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    formData.set('grantOpportunityId', grantOpportunityId);
    setError(null);
    startTransition(async () => {
      const result: ActionState = await addGrantRequirementAction(undefined, formData);
      if (result?.error) setError(result.error);
      else {
        setShowAdd(false);
        (document.getElementById('add-requirement-form') as HTMLFormElement | null)?.reset();
      }
    });
  }

  return (
    <div className="rounded-[16px] border border-gray-200 bg-white p-6">
      <div className="flex items-center justify-between">
        <h2 className="text-[15px] font-bold text-gray-900">Requirements</h2>
        <span className="text-[12.5px] text-gray-500">
          {completeCount} of {requirements.length} complete
        </span>
      </div>

      <div className="mt-3 flex flex-col divide-y divide-gray-50">
        {requirements.length === 0 && !showAdd && (
          <p className="py-3 text-sm text-gray-600">No requirements tracked yet.</p>
        )}
        {requirements.map((r) => (
          <div key={r.id} className="flex items-center gap-3 py-2.5">
            <button
              type="button"
              onClick={() => handleToggle(r.id)}
              disabled={!canEdit || isPending}
              className={`flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full border ${
                r.isComplete ? 'border-success bg-success' : 'border-gray-300'
              }`}
              aria-label={r.isComplete ? 'Mark incomplete' : 'Mark complete'}
            >
              {r.isComplete && <span className="h-2 w-2 rounded-full bg-white" />}
            </button>
            <div className="min-w-0 flex-1">
              <p className={`text-[14px] ${r.isComplete ? 'text-gray-400 line-through' : 'text-gray-900'}`}>
                {r.name}
              </p>
              {r.dueDate && <p className="text-xs text-gray-500">Due {formatDate(r.dueDate)}</p>}
            </div>
            {canEdit && (
              <button
                type="button"
                onClick={() => handleDelete(r.id)}
                className="flex-shrink-0 text-gray-400 hover:text-error"
                aria-label="Remove requirement"
              >
                <Trash2 size={14} />
              </button>
            )}
          </div>
        ))}
      </div>

      {canEdit && (
        <>
          {showAdd ? (
            <form id="add-requirement-form" onSubmit={handleAdd} className="mt-3 flex flex-col gap-2.5 rounded-xl bg-gray-50 p-4">
              <input
                name="name"
                required
                placeholder="Letter of intent"
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-teal focus:outline-none focus:ring-2 focus:ring-teal/20"
              />
              <input
                name="dueDate"
                type="date"
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
              Add requirement
            </button>
          )}
        </>
      )}
    </div>
  );
}

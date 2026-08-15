'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Trash2 } from 'lucide-react';
import { PlanType, MilestoneCategory, TaskPriority } from '@prisma/client';
import SubmitButton from '@/components/SubmitButton';
import { PLAN_TYPES, PLAN_TYPE_LABELS, MILESTONE_CATEGORIES, MILESTONE_CATEGORY_LABELS } from '@/lib/success-plans';
import { savePlanTemplateAction, type ActionState } from '@/lib/actions/plan-templates';

type MilestoneDraft = {
  title: string;
  category: MilestoneCategory;
  priority: TaskPriority;
  notes?: string;
  dayOffset: number;
};

export type PlanTemplateFormValues = {
  id?: string;
  name: string;
  description?: string | null;
  planType?: PlanType | null;
  milestones: MilestoneDraft[];
};

export default function PlanTemplateForm({ template }: { template?: PlanTemplateFormValues }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [milestones, setMilestones] = useState<MilestoneDraft[]>(
    template?.milestones.length
      ? template.milestones
      : [{ title: '', category: MilestoneCategory.OTHER, priority: TaskPriority.MEDIUM, dayOffset: 0 }],
  );

  function updateMilestone(index: number, patch: Partial<MilestoneDraft>) {
    setMilestones((prev) => prev.map((m, i) => (i === index ? { ...m, ...patch } : m)));
  }

  function addMilestone() {
    const lastOffset = milestones[milestones.length - 1]?.dayOffset ?? 0;
    setMilestones((prev) => [
      ...prev,
      { title: '', category: MilestoneCategory.OTHER, priority: TaskPriority.MEDIUM, dayOffset: lastOffset + 7 },
    ]);
  }

  function removeMilestone(index: number) {
    setMilestones((prev) => prev.filter((_, i) => i !== index));
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (milestones.length === 0) {
      setError('Add at least one milestone.');
      return;
    }
    if (milestones.some((m) => !m.title.trim())) {
      setError('Every milestone needs a title.');
      return;
    }
    const formData = new FormData(e.currentTarget);
    formData.set('milestonesJson', JSON.stringify(milestones));
    setError(null);
    startTransition(async () => {
      const result: ActionState = await savePlanTemplateAction(undefined, formData);
      if (result?.error) setError(result.error);
    });
  }

  const inputClasses =
    'w-full rounded-[10px] border border-gray-200 px-3.5 py-3 text-sm focus:border-teal focus:outline-none focus:ring-2 focus:ring-teal/20';
  const labelClasses = 'mb-1.5 block text-[13px] font-semibold text-gray-900';

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6">
      {template?.id && <input type="hidden" name="id" value={template.id} />}

      <div className="rounded-[16px] border border-gray-200 p-5">
        <h3 className="mb-4 text-[13px] font-bold uppercase tracking-wide text-gray-600">Template</h3>
        <div className="flex flex-col gap-4">
          <div>
            <label htmlFor="name" className={labelClasses}>
              Name
            </label>
            <input
              id="name"
              name="name"
              required
              defaultValue={template?.name ?? ''}
              placeholder="Major gift cultivation"
              className={inputClasses}
            />
          </div>
          <div>
            <label htmlFor="description" className={labelClasses}>
              Description (optional)
            </label>
            <textarea
              id="description"
              name="description"
              rows={2}
              defaultValue={template?.description ?? ''}
              className={`${inputClasses} resize-y`}
            />
          </div>
          <div>
            <label htmlFor="planType" className={labelClasses}>
              Plan type this is designed for (optional)
            </label>
            <select id="planType" name="planType" defaultValue={template?.planType ?? ''} className={inputClasses}>
              <option value="">Any plan type</option>
              {PLAN_TYPES.map((t) => (
                <option key={t} value={t}>
                  {PLAN_TYPE_LABELS[t]}
                </option>
              ))}
            </select>
            <p className="mt-1.5 text-xs text-gray-600">
              Used to suggest this template contextually — it can still be applied to any plan.
            </p>
          </div>
        </div>
      </div>

      <div className="rounded-[16px] border border-gray-200 p-5">
        <h3 className="mb-4 text-[13px] font-bold uppercase tracking-wide text-gray-600">Milestones</h3>
        <div className="flex flex-col gap-3">
          {milestones.map((m, i) => (
            <div key={i} className="flex flex-col gap-3 rounded-xl bg-gray-50 p-4">
              <div className="flex items-start gap-3">
                <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-evergreen/10 text-[13px] font-bold text-evergreen">
                  {i + 1}
                </div>
                <div className="flex-1">
                  <label className="mb-1.5 block text-[12px] font-semibold text-gray-900">Title</label>
                  <input
                    type="text"
                    required
                    value={m.title}
                    onChange={(e) => updateMilestone(i, { title: e.target.value })}
                    placeholder="e.g. Schedule cultivation call"
                    className={inputClasses}
                  />
                </div>
                <button
                  type="button"
                  onClick={() => removeMilestone(i)}
                  disabled={milestones.length === 1}
                  className="mt-7 flex-shrink-0 text-gray-400 hover:text-error disabled:opacity-30"
                  aria-label="Remove milestone"
                >
                  <Trash2 size={16} />
                </button>
              </div>

              <div className="ml-12 grid grid-cols-2 gap-3 sm:grid-cols-3">
                <div>
                  <label className="mb-1.5 block text-[12px] font-semibold text-gray-900">Category</label>
                  <select
                    value={m.category}
                    onChange={(e) => updateMilestone(i, { category: e.target.value as MilestoneCategory })}
                    className={inputClasses}
                  >
                    {MILESTONE_CATEGORIES.map((c) => (
                      <option key={c} value={c}>
                        {MILESTONE_CATEGORY_LABELS[c]}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-1.5 block text-[12px] font-semibold text-gray-900">Priority</label>
                  <select
                    value={m.priority}
                    onChange={(e) => updateMilestone(i, { priority: e.target.value as TaskPriority })}
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
                  <label className="mb-1.5 block text-[12px] font-semibold text-gray-900">Day offset</label>
                  <input
                    type="number"
                    min={0}
                    value={m.dayOffset}
                    onChange={(e) => updateMilestone(i, { dayOffset: Math.max(0, Number(e.target.value)) })}
                    className={inputClasses}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
        <button
          type="button"
          onClick={addMilestone}
          className="mt-3 flex items-center gap-1.5 text-[13px] font-semibold text-evergreen hover:text-[#0d685f]"
        >
          <Plus size={14} />
          Add milestone
        </button>
      </div>

      {error && (
        <p className="rounded-lg bg-red-50 px-3.5 py-2.5 text-sm font-medium text-red-600">{error}</p>
      )}

      <div className="flex gap-3">
        <SubmitButton pending={isPending}>{template?.id ? 'Save changes' : 'Create template'}</SubmitButton>
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

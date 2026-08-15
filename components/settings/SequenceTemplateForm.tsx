'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Trash2 } from 'lucide-react';
import { RetentionRisk } from '@prisma/client';
import SubmitButton from '@/components/SubmitButton';
import { saveSequenceTemplateAction, type ActionState } from '@/lib/actions/sequence-templates';

type StepDraft = { emailTemplateId: string; dayOffset: number };

export type SequenceTemplateFormValues = {
  id?: string;
  name: string;
  description?: string | null;
  suggestedForRisk?: RetentionRisk | null;
  steps: StepDraft[];
};

const RISK_LABELS: Record<RetentionRisk, string> = {
  LOW: 'Low risk',
  MEDIUM: 'Medium risk',
  HIGH: 'High risk',
  CRITICAL: 'Critical risk',
};

export default function SequenceTemplateForm({
  template,
  emailTemplates,
}: {
  template?: SequenceTemplateFormValues;
  emailTemplates: { id: string; name: string }[];
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [steps, setSteps] = useState<StepDraft[]>(
    template?.steps.length
      ? template.steps
      : [{ emailTemplateId: emailTemplates[0]?.id ?? '', dayOffset: 0 }],
  );

  function updateStep(index: number, patch: Partial<StepDraft>) {
    setSteps((prev) => prev.map((s, i) => (i === index ? { ...s, ...patch } : s)));
  }

  function addStep() {
    const lastOffset = steps[steps.length - 1]?.dayOffset ?? 0;
    setSteps((prev) => [...prev, { emailTemplateId: emailTemplates[0]?.id ?? '', dayOffset: lastOffset + 7 }]);
  }

  function removeStep(index: number) {
    setSteps((prev) => prev.filter((_, i) => i !== index));
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (steps.length === 0) {
      setError('Add at least one step.');
      return;
    }
    if (steps.some((s) => !s.emailTemplateId)) {
      setError('Every step needs an email template selected.');
      return;
    }
    const formData = new FormData(e.currentTarget);
    formData.set('stepsJson', JSON.stringify(steps));
    setError(null);
    startTransition(async () => {
      const result: ActionState = await saveSequenceTemplateAction(undefined, formData);
      if (result?.error) setError(result.error);
    });
  }

  const inputClasses =
    'w-full rounded-[10px] border border-gray-200 px-3.5 py-3 text-sm focus:border-teal focus:outline-none focus:ring-2 focus:ring-teal/20';
  const labelClasses = 'mb-1.5 block text-[13px] font-semibold text-gray-900';

  if (emailTemplates.length === 0) {
    return (
      <div className="rounded-[16px] border border-dashed border-gray-200 p-6 text-center text-sm text-gray-600">
        You need at least one email template before building a sequence.{' '}
        <a href="/settings/email-templates/new" className="font-semibold text-evergreen">
          Create one first →
        </a>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6">
      {template?.id && <input type="hidden" name="id" value={template.id} />}

      <div className="rounded-[16px] border border-gray-200 p-5">
        <h3 className="mb-4 text-[13px] font-bold uppercase tracking-wide text-gray-600">
          Sequence
        </h3>
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
              placeholder="New major donor welcome"
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
            <label htmlFor="suggestedForRisk" className={labelClasses}>
              Suggest for donors at this risk tier
            </label>
            <select
              id="suggestedForRisk"
              name="suggestedForRisk"
              defaultValue={template?.suggestedForRisk ?? ''}
              className={inputClasses}
            >
              <option value="">Don&rsquo;t suggest automatically</option>
              {Object.values(RetentionRisk).map((r) => (
                <option key={r} value={r}>
                  {RISK_LABELS[r]}
                </option>
              ))}
            </select>
            <p className="mt-1.5 text-xs text-gray-600">
              When a donor is at this risk tier and has no active sequence, this one is suggested
              on their page — never started automatically.
            </p>
          </div>
        </div>
      </div>

      <div className="rounded-[16px] border border-gray-200 p-5">
        <h3 className="mb-4 text-[13px] font-bold uppercase tracking-wide text-gray-600">
          Steps
        </h3>
        <div className="flex flex-col gap-3">
          {steps.map((step, i) => (
            <div key={i} className="flex items-end gap-3 rounded-xl bg-gray-50 p-4">
              <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-evergreen/10 text-[13px] font-bold text-evergreen">
                {i + 1}
              </div>
              <div className="flex-1">
                <label className="mb-1.5 block text-[12px] font-semibold text-gray-900">
                  Email template
                </label>
                <select
                  value={step.emailTemplateId}
                  onChange={(e) => updateStep(i, { emailTemplateId: e.target.value })}
                  className={inputClasses}
                >
                  {emailTemplates.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="w-32 flex-shrink-0">
                <label className="mb-1.5 block text-[12px] font-semibold text-gray-900">
                  Day offset
                </label>
                <input
                  type="number"
                  min={0}
                  value={step.dayOffset}
                  onChange={(e) => updateStep(i, { dayOffset: Math.max(0, Number(e.target.value)) })}
                  className={inputClasses}
                />
              </div>
              <button
                type="button"
                onClick={() => removeStep(i)}
                disabled={steps.length === 1}
                className="mb-1 flex-shrink-0 text-gray-400 hover:text-error disabled:opacity-30"
                aria-label="Remove step"
              >
                <Trash2 size={16} />
              </button>
            </div>
          ))}
        </div>
        <button
          type="button"
          onClick={addStep}
          className="mt-3 flex items-center gap-1.5 text-[13px] font-semibold text-evergreen hover:text-[#0d685f]"
        >
          <Plus size={14} />
          Add step
        </button>
      </div>

      {error && (
        <p className="rounded-lg bg-red-50 px-3.5 py-2.5 text-sm font-medium text-red-600">{error}</p>
      )}

      <div className="flex gap-3">
        <SubmitButton pending={isPending}>
          {template?.id ? 'Save changes' : 'Create sequence'}
        </SubmitButton>
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

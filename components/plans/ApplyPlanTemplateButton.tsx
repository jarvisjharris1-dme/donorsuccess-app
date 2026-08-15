'use client';

import { useState, useTransition } from 'react';
import { LayoutTemplate } from 'lucide-react';
import { applyPlanTemplateAction, type ActionState } from '@/lib/actions/plan-templates';

export default function ApplyPlanTemplateButton({
  planId,
  donorId,
  templates,
}: {
  planId: string;
  donorId: string;
  templates: { id: string; name: string; milestoneCount: number }[];
}) {
  const [showPicker, setShowPicker] = useState(false);
  const [templateId, setTemplateId] = useState(templates[0]?.id ?? '');
  const [message, setMessage] = useState<{ text: string; isError: boolean } | null>(null);
  const [isPending, startTransition] = useTransition();

  if (templates.length === 0) return null;

  function handleApply() {
    if (!templateId) return;
    const formData = new FormData();
    formData.set('planId', planId);
    formData.set('donorId', donorId);
    formData.set('templateId', templateId);
    setMessage(null);
    startTransition(async () => {
      const result: ActionState = await applyPlanTemplateAction(undefined, formData);
      if (result?.error) setMessage({ text: result.error, isError: true });
      else {
        setMessage({ text: result?.success ?? 'Applied.', isError: false });
        setShowPicker(false);
      }
    });
  }

  return (
    <div className="mb-4">
      {!showPicker ? (
        <button
          type="button"
          onClick={() => setShowPicker(true)}
          className="flex items-center gap-1.5 text-[13px] font-semibold text-evergreen hover:text-[#0d685f]"
        >
          <LayoutTemplate size={14} />
          Apply a template
        </button>
      ) : (
        <div className="flex flex-wrap items-center gap-2 rounded-xl bg-gray-50 p-3">
          <select
            value={templateId}
            onChange={(e) => setTemplateId(e.target.value)}
            className="rounded-lg border border-gray-200 px-3 py-2 text-sm"
          >
            {templates.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name} ({t.milestoneCount} milestone{t.milestoneCount === 1 ? '' : 's'})
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={handleApply}
            disabled={isPending}
            className="rounded-lg bg-evergreen px-3.5 py-2 text-[13px] font-semibold text-white disabled:opacity-60"
          >
            {isPending ? 'Applying…' : 'Apply'}
          </button>
          <button
            type="button"
            onClick={() => setShowPicker(false)}
            className="rounded-lg border border-gray-200 px-3.5 py-2 text-[13px] font-semibold text-gray-600"
          >
            Cancel
          </button>
        </div>
      )}
      {message && (
        <p className={`mt-2 text-xs font-medium ${message.isError ? 'text-error' : 'text-success'}`}>
          {message.text}
        </p>
      )}
    </div>
  );
}

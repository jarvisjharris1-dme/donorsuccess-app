'use client';

import { useState, useTransition } from 'react';
import { saveEmailTemplateAction, type ActionState } from '@/lib/actions/email-templates';
import SubmitButton from '@/components/SubmitButton';
import { MERGE_FIELDS } from '@/lib/email-templates';

type Campaign = { id: string; name: string };

export default function EmailTemplateForm({
  template,
  campaigns,
}: {
  template?: {
    id: string;
    name: string;
    subject: string;
    body: string;
    suggestedForRisk: string | null;
    campaignId: string | null;
  };
  campaigns: Campaign[];
}) {
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    setError(null);
    startTransition(async () => {
      const result: ActionState = await saveEmailTemplateAction(undefined, formData);
      if (result?.error) setError(result.error);
    });
  }

  const inputClasses =
    'w-full rounded-[10px] border border-gray-200 px-3.5 py-3 text-sm focus:border-teal focus:outline-none focus:ring-2 focus:ring-teal/20';
  const labelClasses = 'mb-1.5 block text-[13px] font-semibold text-gray-900';

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      {template?.id && <input type="hidden" name="id" value={template.id} />}

      <div>
        <label htmlFor="name" className={labelClasses}>
          Template name
        </label>
        <input
          id="name"
          name="name"
          type="text"
          required
          defaultValue={template?.name}
          placeholder="Check-in: at-risk donor"
          className={inputClasses}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label htmlFor="suggestedForRisk" className={labelClasses}>
            Suggest for retention risk
          </label>
          <select
            id="suggestedForRisk"
            name="suggestedForRisk"
            defaultValue={template?.suggestedForRisk ?? ''}
            className={inputClasses}
          >
            <option value="">Not risk-specific</option>
            <option value="LOW">Low</option>
            <option value="MEDIUM">Medium</option>
            <option value="HIGH">High</option>
            <option value="CRITICAL">Critical</option>
          </select>
        </div>
        <div>
          <label htmlFor="campaignId" className={labelClasses}>
            Associated campaign
          </label>
          <select
            id="campaignId"
            name="campaignId"
            defaultValue={template?.campaignId ?? ''}
            className={inputClasses}
          >
            <option value="">No campaign</option>
            {campaigns.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label htmlFor="subject" className={labelClasses}>
          Subject
        </label>
        <input
          id="subject"
          name="subject"
          type="text"
          required
          defaultValue={template?.subject}
          placeholder="Checking in, {{firstName}}"
          className={inputClasses}
        />
      </div>

      <div>
        <label htmlFor="body" className={labelClasses}>
          Body
        </label>
        <textarea
          id="body"
          name="body"
          rows={10}
          required
          defaultValue={template?.body}
          placeholder={'Hi {{firstName}},\n\nIt has been a while since we last connected...'}
          className={inputClasses}
        />
        <div className="mt-2 flex flex-wrap gap-1.5">
          {MERGE_FIELDS.map((f) => (
            <span
              key={f.token}
              title={f.label}
              className="rounded-full bg-gray-100 px-2.5 py-1 text-[11px] font-medium text-gray-600"
            >
              {f.token}
            </span>
          ))}
        </div>
      </div>

      {error && (
        <p className="rounded-lg bg-red-50 px-3.5 py-2.5 text-sm font-medium text-red-600">{error}</p>
      )}

      <div>
        <SubmitButton pending={isPending}>{template ? 'Save changes' : 'Create template'}</SubmitButton>
      </div>
    </form>
  );
}

'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { Mail } from 'lucide-react';
import SubmitButton from '@/components/SubmitButton';
import { sendDonorEmailAction, type ActionState } from '@/lib/actions/send-email';
import { renderTemplate, type MergeContext } from '@/lib/email-templates';

export type EmailTemplateOption = {
  id: string;
  name: string;
  subject: string;
  body: string;
  suggested: boolean;
};

export default function SendEmailPanel({
  donorId,
  donorEmail,
  mergeContext,
  templates,
  hasEmailConnection,
}: {
  donorId: string;
  donorEmail: string;
  mergeContext: MergeContext;
  templates: EmailTemplateOption[];
  hasEmailConnection: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [templateId, setTemplateId] = useState('');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleTemplateChange(id: string) {
    setTemplateId(id);
    const tmpl = templates.find((t) => t.id === id);
    if (tmpl) {
      setSubject(renderTemplate(tmpl.subject, mergeContext));
      setBody(renderTemplate(tmpl.body, mergeContext));
    }
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const formData = new FormData();
    formData.set('donorId', donorId);
    formData.set('subject', subject);
    formData.set('body', body);
    startTransition(async () => {
      const result: ActionState = await sendDonorEmailAction(undefined, formData);
      if (result?.error) setError(result.error);
      else {
        setOpen(false);
        setSubject('');
        setBody('');
        setTemplateId('');
      }
    });
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 rounded-xl border border-gray-200 px-4 py-2.5 text-[13.5px] font-semibold text-gray-900 transition-colors hover:border-gray-300"
      >
        <Mail size={15} />
        Send email
      </button>
    );
  }

  if (!hasEmailConnection) {
    return (
      <div className="rounded-[16px] border border-gray-200 bg-white p-6">
        <p className="text-sm text-gray-600">
          Connect Gmail or Outlook in{' '}
          <Link href="/settings" className="font-semibold text-evergreen">
            Settings
          </Link>{' '}
          before sending email from here.
        </p>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="mt-3 text-[13px] font-semibold text-gray-600"
        >
          Close
        </button>
      </div>
    );
  }

  const inputClasses =
    'w-full rounded-[10px] border border-gray-200 px-3.5 py-3 text-sm focus:border-teal focus:outline-none focus:ring-2 focus:ring-teal/20';

  return (
    <div className="rounded-[16px] border border-gray-200 bg-white p-6">
      <h3 className="text-[15px] font-bold text-gray-900">Send email to {donorEmail}</h3>

      <form onSubmit={handleSubmit} className="mt-4 flex flex-col gap-3">
        {templates.length > 0 && (
          <select
            value={templateId}
            onChange={(e) => handleTemplateChange(e.target.value)}
            className={inputClasses}
          >
            <option value="">Choose a template (optional)</option>
            {templates.map((t) => (
              <option key={t.id} value={t.id}>
                {t.suggested ? '★ ' : ''}
                {t.name}
              </option>
            ))}
          </select>
        )}

        <input
          type="text"
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          placeholder="Subject"
          required
          className={inputClasses}
        />
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={9}
          placeholder="Message"
          required
          className={inputClasses}
        />

        {error && (
          <p className="rounded-lg bg-red-50 px-3.5 py-2.5 text-sm font-medium text-red-600">
            {error}
          </p>
        )}

        <div className="flex gap-3">
          <SubmitButton pending={isPending}>Send</SubmitButton>
          <button
            type="button"
            onClick={() => setOpen(false)}
            disabled={isPending}
            className="rounded-xl border border-gray-200 px-5 py-3.5 text-[15px] font-semibold text-gray-600 transition-colors hover:border-gray-300 disabled:opacity-60"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}

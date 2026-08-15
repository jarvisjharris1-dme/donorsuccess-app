'use client';

import { useState, useTransition } from 'react';
import { submitSupportRequestAction, type ActionState } from '@/lib/actions/support';

export default function SupportRequestForm() {
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const formData = new FormData(form);
    setError(null);
    setSuccess(null);
    startTransition(async () => {
      const result: ActionState = await submitSupportRequestAction(undefined, formData);
      if (result?.error) setError(result.error);
      else {
        setSuccess(result?.success ?? 'Sent.');
        form.reset();
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4 rounded-[16px] border border-gray-200 bg-white p-6">
      <div>
        <label htmlFor="subject" className="mb-1 block text-xs font-semibold text-gray-600">
          Subject
        </label>
        <input
          id="subject"
          name="subject"
          type="text"
          required
          placeholder="What's this about?"
          className="w-full rounded-[10px] border border-gray-200 px-3.5 py-2.5 text-sm focus:border-teal focus:outline-none focus:ring-2 focus:ring-teal/20"
        />
      </div>
      <div>
        <label htmlFor="message" className="mb-1 block text-xs font-semibold text-gray-600">
          Tell us what&rsquo;s going on
        </label>
        <textarea
          id="message"
          name="message"
          required
          rows={6}
          placeholder="The more detail the better — what you were trying to do, what happened instead, anything you've already tried."
          className="w-full rounded-[10px] border border-gray-200 px-3.5 py-2.5 text-sm focus:border-teal focus:outline-none focus:ring-2 focus:ring-teal/20"
        />
      </div>

      {error && <p className="text-sm font-medium text-error">{error}</p>}
      {success && <p className="text-sm font-medium text-success">{success}</p>}

      <div>
        <button
          type="submit"
          disabled={isPending}
          className="rounded-[10px] bg-evergreen px-5 py-2.5 text-[14px] font-semibold text-white transition-colors hover:bg-[#0d685f] disabled:opacity-60"
        >
          {isPending ? 'Sending…' : 'Send to support'}
        </button>
      </div>
    </form>
  );
}

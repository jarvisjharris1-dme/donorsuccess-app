'use client';

import { useState, useTransition } from 'react';
import SubmitButton from '@/components/SubmitButton';
import { updateOwnProfileAction, type ActionState } from '@/lib/actions/settings';

export default function ProfileForm({ currentName }: { currentName: string | null }) {
  const [message, setMessage] = useState<{ type: 'error' | 'success'; text: string } | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    setMessage(null);
    startTransition(async () => {
      const result: ActionState = await updateOwnProfileAction(undefined, formData);
      if (result?.error) setMessage({ type: 'error', text: result.error });
      else if (result?.success) setMessage({ type: 'success', text: result.success });
    });
  }

  return (
    <form onSubmit={handleSubmit} className="flex max-w-sm flex-col gap-4">
      <div>
        <label htmlFor="name" className="mb-1.5 block text-[13px] font-semibold text-gray-900">
          Display name
        </label>
        <input
          id="name"
          name="name"
          type="text"
          required
          maxLength={100}
          defaultValue={currentName ?? ''}
          autoComplete="name"
          className="w-full rounded-[10px] border border-gray-200 px-3.5 py-3 text-sm focus:border-teal focus:outline-none focus:ring-2 focus:ring-teal/20"
        />
        <p className="mt-1.5 text-xs text-gray-600">
          Shown to your teammates throughout the app — on the sidebar, in comments, and
          anywhere you&rsquo;re credited as the owner of something.
        </p>
      </div>

      {message && (
        <p
          className={`rounded-lg px-3.5 py-2.5 text-sm font-medium ${
            message.type === 'error' ? 'bg-red-50 text-red-600' : 'bg-success/10 text-success'
          }`}
        >
          {message.text}
        </p>
      )}

      <div>
        <SubmitButton pending={isPending}>Save name</SubmitButton>
      </div>
    </form>
  );
}

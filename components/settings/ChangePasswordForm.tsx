'use client';

import { useState, useTransition } from 'react';
import SubmitButton from '@/components/SubmitButton';
import { changeOwnPasswordAction, type ActionState } from '@/lib/actions/settings';

export default function ChangePasswordForm() {
  const [message, setMessage] = useState<{ type: 'error' | 'success'; text: string } | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const formData = new FormData(form);
    setMessage(null);
    startTransition(async () => {
      const result: ActionState = await changeOwnPasswordAction(undefined, formData);
      if (result?.error) setMessage({ type: 'error', text: result.error });
      else if (result?.success) {
        setMessage({ type: 'success', text: result.success });
        form.reset();
      }
    });
  }

  const inputClasses =
    'w-full rounded-[10px] border border-gray-200 px-3.5 py-3 text-sm focus:border-teal focus:outline-none focus:ring-2 focus:ring-teal/20';

  return (
    <form onSubmit={handleSubmit} className="flex max-w-sm flex-col gap-4">
      <div>
        <label
          htmlFor="currentPassword"
          className="mb-1.5 block text-[13px] font-semibold text-gray-900"
        >
          Current password
        </label>
        <input
          id="currentPassword"
          name="currentPassword"
          type="password"
          required
          autoComplete="current-password"
          className={inputClasses}
        />
      </div>
      <div>
        <label htmlFor="newPassword" className="mb-1.5 block text-[13px] font-semibold text-gray-900">
          New password
        </label>
        <input
          id="newPassword"
          name="newPassword"
          type="password"
          required
          autoComplete="new-password"
          className={inputClasses}
        />
        <p className="mt-1.5 text-xs text-gray-600">
          At least 10 characters, with one uppercase letter and one number.
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
        <SubmitButton pending={isPending}>Update password</SubmitButton>
      </div>
    </form>
  );
}

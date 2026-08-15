'use client';

import { useState, useTransition } from 'react';
import { acceptInviteAction } from '../../actions';
import SubmitButton from '@/components/SubmitButton';

export default function AcceptInviteForm({ token }: { token: string }) {
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    setError(null);
    startTransition(async () => {
      const result = await acceptInviteAction(undefined, formData);
      if (result?.error) setError(result.error);
    });
  }

  const inputClasses =
    'w-full rounded-[10px] border border-gray-200 px-3.5 py-3 text-sm focus:border-teal focus:outline-none focus:ring-2 focus:ring-teal/20';

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <input type="hidden" name="token" value={token} />

      <div>
        <label htmlFor="name" className="mb-1.5 block text-[13px] font-semibold text-gray-900">
          Your name
        </label>
        <input id="name" name="name" type="text" required className={inputClasses} />
      </div>
      <div>
        <label htmlFor="password" className="mb-1.5 block text-[13px] font-semibold text-gray-900">
          Password
        </label>
        <input
          id="password"
          name="password"
          type="password"
          required
          autoComplete="new-password"
          className={inputClasses}
        />
        <p className="mt-1.5 text-xs text-gray-600">
          At least 10 characters, with one uppercase letter and one number.
        </p>
      </div>

      {error && (
        <p className="rounded-lg bg-red-50 px-3.5 py-2.5 text-sm font-medium text-red-600">
          {error}
        </p>
      )}

      <SubmitButton pending={isPending}>Create account</SubmitButton>
    </form>
  );
}

'use client';

import { useState, useTransition } from 'react';
import SubmitButton from '@/components/SubmitButton';
import { updateOrganizationAction, type ActionState } from '@/lib/actions/settings';

const COMMON_TIMEZONES = [
  'America/New_York',
  'America/Chicago',
  'America/Denver',
  'America/Los_Angeles',
  'America/Anchorage',
  'Pacific/Honolulu',
];

export default function OrgProfileForm({
  organization,
}: {
  organization: { name: string; timezone: string; subscriptionTier: string };
}) {
  const [message, setMessage] = useState<{ type: 'error' | 'success'; text: string } | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    setMessage(null);
    startTransition(async () => {
      const result: ActionState = await updateOrganizationAction(undefined, formData);
      if (result?.error) setMessage({ type: 'error', text: result.error });
      else if (result?.success) setMessage({ type: 'success', text: result.success });
    });
  }

  const inputClasses =
    'w-full rounded-[10px] border border-gray-200 px-3.5 py-3 text-sm focus:border-teal focus:outline-none focus:ring-2 focus:ring-teal/20';
  const labelClasses = 'mb-1.5 block text-[13px] font-semibold text-gray-900';

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="name" className={labelClasses}>
            Organization name
          </label>
          <input
            id="name"
            name="name"
            type="text"
            required
            defaultValue={organization.name}
            className={inputClasses}
          />
        </div>
        <div>
          <label htmlFor="timezone" className={labelClasses}>
            Timezone
          </label>
          <select id="timezone" name="timezone" defaultValue={organization.timezone} className={inputClasses}>
            {COMMON_TIMEZONES.map((tz) => (
              <option key={tz} value={tz}>
                {tz}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="flex items-center gap-2 text-xs text-gray-600">
        Plan:{' '}
        <span className="rounded-full bg-gray-100 px-2.5 py-1 text-[11px] font-semibold capitalize text-gray-900">
          {organization.subscriptionTier.toLowerCase()}
        </span>
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
        <SubmitButton pending={isPending}>Save</SubmitButton>
      </div>
    </form>
  );
}

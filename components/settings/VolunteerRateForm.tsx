'use client';

import { useState, useTransition } from 'react';
import { updateVolunteerRateAction, type ActionState } from '@/lib/actions/volunteer';
import { INDEPENDENT_SECTOR_NATIONAL_RATE } from '@/lib/volunteer';

export default function VolunteerRateForm({ currentOverride }: { currentOverride: string | null }) {
  const [value, setValue] = useState(currentOverride ?? '');
  const [message, setMessage] = useState<{ text: string; isError: boolean } | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData();
    formData.set('rate', value);
    setMessage(null);
    startTransition(async () => {
      const result: ActionState = await updateVolunteerRateAction(undefined, formData);
      if (result?.error) setMessage({ text: result.error, isError: true });
      else setMessage({ text: result?.success ?? 'Saved.', isError: false });
    });
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-2.5">
      <p className="text-sm text-gray-600">
        Current default: <strong>${INDEPENDENT_SECTOR_NATIONAL_RATE.toFixed(2)}/hour</strong> —
        Independent Sector&rsquo;s published national estimate. Override below only if you have a
        specific rate you use instead (e.g. a state-specific figure for grant reporting).
      </p>
      <div className="flex items-center gap-2">
        <span className="text-sm text-gray-500">$</span>
        <input
          type="number"
          min="0.01"
          max="500"
          step="0.01"
          placeholder={INDEPENDENT_SECTOR_NATIONAL_RATE.toFixed(2)}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          className="w-32 rounded-lg border border-gray-200 px-3 py-2 text-sm"
        />
        <span className="text-sm text-gray-500">/ hour</span>
        <button
          type="submit"
          disabled={isPending}
          className="rounded-lg bg-evergreen px-3.5 py-2 text-[13px] font-semibold text-white disabled:opacity-60"
        >
          Save
        </button>
      </div>
      <p className="text-xs text-gray-500">
        Only applies to future entries — changing this never recalculates volunteer hours already
        logged.
      </p>
      {message && (
        <p className={`text-xs font-medium ${message.isError ? 'text-error' : 'text-success'}`}>{message.text}</p>
      )}
    </form>
  );
}

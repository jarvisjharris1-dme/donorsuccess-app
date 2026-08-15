'use client';

import { useState, useTransition } from 'react';
import { updateGivingHistoryFilterAction, type ActionState } from '@/lib/actions/salesforce';

export default function GivingHistoryFilterForm({ currentValue }: { currentValue: number | null }) {
  const [enabled, setEnabled] = useState(currentValue !== null);
  const [years, setYears] = useState(currentValue ?? 5);
  const [message, setMessage] = useState<{ text: string; isError: boolean } | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData();
    formData.set('enabled', String(enabled));
    formData.set('minGivingHistoryYears', String(years));
    setMessage(null);
    startTransition(async () => {
      const result: ActionState = await updateGivingHistoryFilterAction(undefined, formData);
      if (result?.error) setMessage({ text: result.error, isError: true });
      else setMessage({ text: result?.success ?? 'Saved.', isError: false });
    });
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-2.5">
      <label className="flex items-center gap-2 text-sm font-medium text-gray-900">
        <input
          type="checkbox"
          checked={enabled}
          onChange={(e) => setEnabled(e.target.checked)}
        />
        Only sync contacts and accounts with a won gift in the last
      </label>
      {enabled && (
        <div className="flex items-center gap-2 pl-6">
          <input
            type="number"
            min={1}
            max={50}
            value={years}
            onChange={(e) => setYears(Number(e.target.value))}
            className="w-20 rounded-lg border border-gray-200 px-2.5 py-1.5 text-sm"
          />
          <span className="text-sm text-gray-600">years</span>
        </div>
      )}
      <p className="pl-6 text-xs text-gray-500">
        Applies to future syncs only — turning this on never removes donors already synced in.
      </p>
      {message && (
        <p className={`pl-6 text-xs font-medium ${message.isError ? 'text-error' : 'text-success'}`}>
          {message.text}
        </p>
      )}
      <div>
        <button
          type="submit"
          disabled={isPending}
          className="rounded-lg bg-evergreen px-3.5 py-2 text-[13px] font-semibold text-white disabled:opacity-60"
        >
          {isPending ? 'Saving…' : 'Save'}
        </button>
      </div>
    </form>
  );
}

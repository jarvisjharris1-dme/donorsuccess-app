'use client';

import { useState, useTransition } from 'react';
import { InteractionType } from '@prisma/client';
import SubmitButton from '@/components/SubmitButton';
import { createInteractionAction, type ActionState } from '@/lib/actions/interactions';

const TYPE_LABELS: Record<InteractionType, string> = {
  EMAIL: 'Email',
  CALL: 'Call',
  MEETING: 'Meeting',
  EVENT: 'Event',
  LETTER: 'Letter',
  TEXT: 'Text',
  NOTE: 'Note',
};

export default function InteractionForm({
  donorId,
  onDone,
}: {
  donorId: string;
  onDone?: () => void;
}) {
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const formData = new FormData(form);
    setError(null);
    startTransition(async () => {
      const result: ActionState = await createInteractionAction(undefined, formData);
      if (result?.error) {
        setError(result.error);
      } else {
        form.reset();
        onDone?.();
      }
    });
  }

  const inputClasses =
    'w-full rounded-[10px] border border-gray-200 px-3 py-2.5 text-sm focus:border-teal focus:outline-none focus:ring-2 focus:ring-teal/20';

  return (
    <form onSubmit={handleSubmit} className="grid grid-cols-2 gap-3 rounded-[14px] border border-gray-200 bg-gray-50 p-4 sm:grid-cols-4">
      <input type="hidden" name="donorId" value={donorId} />

      <div>
        <label className="mb-1 block text-xs font-semibold text-gray-600">Type</label>
        <select name="type" defaultValue={InteractionType.CALL} className={inputClasses}>
          {Object.values(InteractionType).map((t) => (
            <option key={t} value={t}>
              {TYPE_LABELS[t]}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className="mb-1 block text-xs font-semibold text-gray-600">Date</label>
        <input
          name="occurredAt"
          type="date"
          required
          defaultValue={new Date().toISOString().slice(0, 10)}
          className={inputClasses}
        />
      </div>
      <div className="col-span-2">
        <label className="mb-1 block text-xs font-semibold text-gray-600">Subject</label>
        <input name="subject" type="text" placeholder="e.g. Year-end thank you call" className={inputClasses} />
      </div>
      <div className="col-span-2 sm:col-span-3">
        <label className="mb-1 block text-xs font-semibold text-gray-600">Notes</label>
        <input name="notes" type="text" className={inputClasses} />
      </div>
      <div className="flex items-end">
        <SubmitButton pending={isPending}>Log it</SubmitButton>
      </div>

      {error && (
        <p className="col-span-full rounded-lg bg-red-50 px-3 py-2 text-xs font-medium text-red-600">
          {error}
        </p>
      )}
    </form>
  );
}

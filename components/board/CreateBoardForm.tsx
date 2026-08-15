'use client';

import { useState, useTransition } from 'react';
import { createBoardAction, type ActionState } from '@/lib/actions/board';

export default function CreateBoardForm() {
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    setError(null);
    startTransition(async () => {
      const result: ActionState = await createBoardAction(undefined, formData);
      if (result?.error) setError(result.error);
    });
  }

  return (
    <div className="rounded-[16px] border border-dashed border-gray-200 bg-white p-8 text-center">
      <h2 className="text-[16px] font-bold text-gray-900">Set up your board</h2>
      <p className="mx-auto mt-1 max-w-sm text-sm text-gray-600">
        Create your board to start tracking members, committees, commitments, and meetings.
      </p>
      <form onSubmit={handleSubmit} className="mx-auto mt-5 flex max-w-sm flex-col gap-3 text-left">
        <div>
          <label htmlFor="name" className="mb-1 block text-xs font-semibold text-gray-600">
            Board name
          </label>
          <input
            id="name"
            name="name"
            required
            placeholder="2026 Board of Directors"
            className="w-full rounded-[10px] border border-gray-200 px-3.5 py-2.5 text-sm focus:border-teal focus:outline-none focus:ring-2 focus:ring-teal/20"
          />
        </div>
        <div>
          <label htmlFor="startDate" className="mb-1 block text-xs font-semibold text-gray-600">
            Start date
          </label>
          <input
            id="startDate"
            name="startDate"
            type="date"
            required
            className="w-full rounded-[10px] border border-gray-200 px-3.5 py-2.5 text-sm focus:border-teal focus:outline-none focus:ring-2 focus:ring-teal/20"
          />
        </div>
        {error && <p className="text-sm font-medium text-error">{error}</p>}
        <button
          type="submit"
          disabled={isPending}
          className="rounded-[10px] bg-evergreen px-5 py-2.5 text-[14px] font-semibold text-white transition-colors hover:bg-[#0d685f] disabled:opacity-60"
        >
          {isPending ? 'Creating…' : 'Create board'}
        </button>
      </form>
    </div>
  );
}

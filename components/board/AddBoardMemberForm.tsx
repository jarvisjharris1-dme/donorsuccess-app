'use client';

import { useState, useTransition } from 'react';
import { Plus } from 'lucide-react';
import { BoardRole } from '@prisma/client';
import { BOARD_ROLES, BOARD_ROLE_LABELS } from '@/lib/board-engagement';
import { addBoardTermAction, type ActionState } from '@/lib/actions/board';

export default function AddBoardMemberForm({
  boardId,
  donorOptions,
  committeeOptions,
}: {
  boardId: string;
  donorOptions: { id: string; name: string }[];
  committeeOptions: { id: string; name: string }[];
}) {
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const formData = new FormData(form);
    formData.set('boardId', boardId);
    setError(null);
    startTransition(async () => {
      const result: ActionState = await addBoardTermAction(undefined, formData);
      if (result?.error) setError(result.error);
      else {
        form.reset();
        setShowForm(false);
      }
    });
  }

  if (!showForm) {
    return (
      <button
        type="button"
        onClick={() => setShowForm(true)}
        className="flex items-center gap-2 rounded-xl bg-evergreen px-5 py-3 text-[14px] font-semibold text-white transition-all hover:-translate-y-0.5 hover:bg-[#0d685f]"
      >
        <Plus size={16} />
        Add board member
      </button>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3 rounded-[16px] border border-gray-200 bg-white p-5">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-xs font-semibold text-gray-600">Donor</label>
          <select name="donorId" required defaultValue="" className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm">
            <option value="" disabled>
              Select a donor
            </option>
            {donorOptions.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </select>
          <p className="mt-1 text-xs text-gray-500">
            Not in the list yet? Add them as a donor first, then come back here.
          </p>
        </div>
        <div>
          <label className="mb-1 block text-xs font-semibold text-gray-600">Role</label>
          <select name="role" defaultValue={BoardRole.MEMBER} className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm">
            {BOARD_ROLES.map((r) => (
              <option key={r} value={r}>
                {BOARD_ROLE_LABELS[r]}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs font-semibold text-gray-600">Start date</label>
          <input name="startDate" type="date" required className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm" />
        </div>
        <div>
          <label className="mb-1 block text-xs font-semibold text-gray-600">End date (optional)</label>
          <input name="endDate" type="date" className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm" />
        </div>
      </div>

      {committeeOptions.length > 0 && (
        <div>
          <label className="mb-1.5 block text-xs font-semibold text-gray-600">Committees</label>
          <div className="flex flex-wrap gap-3">
            {committeeOptions.map((c) => (
              <label key={c.id} className="flex items-center gap-1.5 text-sm text-gray-700">
                <input type="checkbox" name="committeeIds" value={c.id} />
                {c.name}
              </label>
            ))}
          </div>
        </div>
      )}

      <label className="flex items-center gap-2 text-sm text-gray-700">
        <input type="checkbox" name="votingMember" value="true" defaultChecked />
        Voting member
      </label>

      {error && <p className="text-sm font-medium text-error">{error}</p>}

      <div className="flex gap-2">
        <button
          type="submit"
          disabled={isPending}
          className="rounded-lg bg-evergreen px-4 py-2 text-[13.5px] font-semibold text-white disabled:opacity-60"
        >
          {isPending ? 'Adding…' : 'Add to board'}
        </button>
        <button
          type="button"
          onClick={() => setShowForm(false)}
          className="rounded-lg border border-gray-200 px-4 py-2 text-[13.5px] font-semibold text-gray-600"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}

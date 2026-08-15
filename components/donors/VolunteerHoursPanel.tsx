'use client';

import { useState, useTransition } from 'react';
import { HeartHandshake, Plus, Trash2 } from 'lucide-react';
import { formatDate, formatCurrency } from '@/lib/format';
import {
  logVolunteerHoursAction,
  updateVolunteerHoursAction,
  deleteVolunteerHoursAction,
  type ActionState,
} from '@/lib/actions/volunteer';

export type VolunteerHoursRow = {
  id: string;
  date: string;
  hours: string;
  activity: string;
  dollarValue: string;
};

export default function VolunteerHoursPanel({
  donorId,
  entries,
  canEdit,
  canDelete,
}: {
  donorId: string;
  entries: VolunteerHoursRow[];
  canEdit: boolean;
  canDelete: boolean;
}) {
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const totalHours = entries.reduce((sum, e) => sum + Number(e.hours), 0);
  const totalValue = entries.reduce((sum, e) => sum + Number(e.dollarValue), 0);

  function handleAdd(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const formData = new FormData(form);
    formData.set('donorId', donorId);
    setError(null);
    startTransition(async () => {
      const result: ActionState = await logVolunteerHoursAction(undefined, formData);
      if (result?.error) setError(result.error);
      else {
        form.reset();
        setShowForm(false);
      }
    });
  }

  function handleEdit(e: React.FormEvent<HTMLFormElement>, id: string) {
    e.preventDefault();
    const form = e.currentTarget;
    const formData = new FormData(form);
    formData.set('id', id);
    setError(null);
    startTransition(async () => {
      const result: ActionState = await updateVolunteerHoursAction(undefined, formData);
      if (result?.error) setError(result.error);
      else setEditingId(null);
    });
  }

  function handleDelete(id: string) {
    if (!confirm('Remove this volunteer hours entry?')) return;
    const formData = new FormData();
    formData.set('id', id);
    startTransition(async () => {
      const result: ActionState = await deleteVolunteerHoursAction(undefined, formData);
      if (result?.error) alert(result.error);
    });
  }

  return (
    <div className="rounded-[16px] border border-gray-200 bg-white p-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <HeartHandshake size={16} className="text-gray-900" />
          <h2 className="text-[15px] font-bold text-gray-900">Volunteer Hours</h2>
        </div>
        {entries.length > 0 && (
          <div className="text-right">
            <p className="text-sm font-bold text-gray-900">
              {totalHours} hrs &middot; {formatCurrency(totalValue.toFixed(2))}
            </p>
            <p className="text-[11px] text-gray-500">estimated value, not a tax-deductible gift</p>
          </div>
        )}
      </div>

      <div className="mt-3 flex flex-col divide-y divide-gray-50">
        {entries.length === 0 && <p className="py-3 text-sm text-gray-600">No volunteer hours logged yet.</p>}
        {entries.map((entry) =>
          editingId === entry.id ? (
            <form
              key={entry.id}
              onSubmit={(e) => handleEdit(e, entry.id)}
              className="flex flex-col gap-2 rounded-xl bg-gray-50 p-3 py-3"
            >
              <div className="grid grid-cols-2 gap-2">
                <input
                  name="date"
                  type="date"
                  required
                  defaultValue={entry.date.slice(0, 10)}
                  className="rounded-lg border border-gray-200 px-2.5 py-1.5 text-sm"
                />
                <input
                  name="hours"
                  type="number"
                  min="0.25"
                  step="0.25"
                  required
                  defaultValue={entry.hours}
                  className="rounded-lg border border-gray-200 px-2.5 py-1.5 text-sm"
                />
              </div>
              <input
                name="activity"
                required
                defaultValue={entry.activity}
                className="rounded-lg border border-gray-200 px-2.5 py-1.5 text-sm"
              />
              <div className="flex gap-2">
                <button
                  type="submit"
                  disabled={isPending}
                  className="rounded-lg bg-evergreen px-3 py-1.5 text-[12.5px] font-semibold text-white disabled:opacity-60"
                >
                  Save
                </button>
                <button
                  type="button"
                  onClick={() => setEditingId(null)}
                  className="rounded-lg border border-gray-200 px-3 py-1.5 text-[12.5px] font-semibold text-gray-600"
                >
                  Cancel
                </button>
              </div>
            </form>
          ) : (
            <div key={entry.id} className="flex items-center justify-between gap-3 py-2.5">
              <div className="min-w-0">
                <p className="truncate text-sm text-gray-900">{entry.activity}</p>
                <p className="text-xs text-gray-500">
                  {formatDate(entry.date)} &middot; {entry.hours} hrs &middot;{' '}
                  {formatCurrency(Number(entry.dollarValue).toFixed(2))} estimated
                </p>
              </div>
              <div className="flex flex-shrink-0 items-center gap-3">
                {canEdit && (
                  <button
                    type="button"
                    onClick={() => setEditingId(entry.id)}
                    className="text-[12px] font-semibold text-evergreen hover:text-[#0d685f]"
                  >
                    Edit
                  </button>
                )}
                {canDelete && (
                  <button
                    type="button"
                    onClick={() => handleDelete(entry.id)}
                    className="text-gray-400 hover:text-error"
                    aria-label="Remove entry"
                  >
                    <Trash2 size={14} />
                  </button>
                )}
              </div>
            </div>
          ),
        )}
      </div>

      {canEdit && (
        <div className="mt-3 border-t border-gray-50 pt-3">
          {!showForm ? (
            <button
              type="button"
              onClick={() => setShowForm(true)}
              className="flex items-center gap-1.5 text-[13px] font-semibold text-evergreen hover:text-[#0d685f]"
            >
              <Plus size={14} />
              Log volunteer hours
            </button>
          ) : (
            <form onSubmit={handleAdd} className="flex flex-col gap-2.5 rounded-xl bg-gray-50 p-4">
              <div className="grid grid-cols-2 gap-2">
                <input name="date" type="date" required className="rounded-lg border border-gray-200 px-2.5 py-2 text-sm" />
                <input
                  name="hours"
                  type="number"
                  min="0.25"
                  step="0.25"
                  required
                  placeholder="Hours"
                  className="rounded-lg border border-gray-200 px-2.5 py-2 text-sm"
                />
              </div>
              <input
                name="activity"
                required
                placeholder="e.g. Staffed the fall gala check-in table"
                className="rounded-lg border border-gray-200 px-2.5 py-2 text-sm"
              />
              {error && <p className="text-xs font-medium text-error">{error}</p>}
              <div className="flex gap-2">
                <button
                  type="submit"
                  disabled={isPending}
                  className="rounded-lg bg-evergreen px-3.5 py-2 text-[13px] font-semibold text-white disabled:opacity-60"
                >
                  {isPending ? 'Saving…' : 'Log hours'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="rounded-lg border border-gray-200 px-3.5 py-2 text-[13px] font-semibold text-gray-600"
                >
                  Cancel
                </button>
              </div>
            </form>
          )}
        </div>
      )}
    </div>
  );
}

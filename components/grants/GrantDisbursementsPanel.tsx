'use client';

import { useState, useTransition } from 'react';
import { CircleDollarSign, Pencil, Trash2 } from 'lucide-react';
import {
  updateGrantDisbursementAction,
  deleteGrantDisbursementAction,
  type ActionState,
} from '@/lib/actions/grants';
import RecordDisbursementForm from '@/components/grants/RecordDisbursementForm';

export type DisbursementRow = { id: string; amount: string; date: string; notes: string | null };

function formatCurrency(amountStr: string): string {
  return Number(amountStr).toLocaleString('en-US', { style: 'currency', currency: 'USD' });
}

function toDateInputValue(iso: string): string {
  return iso.slice(0, 10);
}

export default function GrantDisbursementsPanel({
  grantId,
  grantOpportunityId,
  disbursements,
  awardAmount,
  canEdit,
}: {
  grantId: string;
  grantOpportunityId: string;
  disbursements: DisbursementRow[];
  awardAmount: string;
  canEdit: boolean;
}) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const totalDisbursed = disbursements.reduce((sum, g) => sum + Number(g.amount), 0);

  function handleUpdate(e: React.FormEvent<HTMLFormElement>, giftId: string) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    formData.set('giftId', giftId);
    formData.set('grantOpportunityId', grantOpportunityId);
    setError(null);
    startTransition(async () => {
      const result: ActionState = await updateGrantDisbursementAction(undefined, formData);
      if (result?.error) setError(result.error);
      else setEditingId(null);
    });
  }

  function handleDelete(giftId: string) {
    if (
      !confirm(
        'Remove this disbursement? This also reverses its effect on the funder\u2019s lifetime giving total and health score.',
      )
    )
      return;
    const formData = new FormData();
    formData.set('giftId', giftId);
    formData.set('grantOpportunityId', grantOpportunityId);
    startTransition(async () => {
      const result: ActionState = await deleteGrantDisbursementAction(undefined, formData);
      if (result?.error) alert(result.error);
    });
  }

  return (
    <div className="rounded-[16px] border border-gray-200 bg-white p-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <CircleDollarSign size={16} className="text-gray-900" />
          <h2 className="text-[15px] font-bold text-gray-900">Disbursements</h2>
        </div>
        <span className="text-[12.5px] text-gray-500">
          {formatCurrency(totalDisbursed.toString())} of {formatCurrency(awardAmount)} received
        </span>
      </div>

      <div className="mt-3 flex flex-col divide-y divide-gray-50">
        {disbursements.length === 0 && <p className="py-2 text-sm text-gray-600">No disbursements recorded yet.</p>}
        {disbursements.map((g) =>
          editingId === g.id ? (
            <form key={g.id} onSubmit={(e) => handleUpdate(e, g.id)} className="flex flex-col gap-2 py-3">
              <div className="grid grid-cols-2 gap-2">
                <input
                  name="amount"
                  type="number"
                  min="0"
                  step="0.01"
                  required
                  defaultValue={g.amount}
                  className="rounded-lg border border-gray-200 px-2.5 py-1.5 text-[13px]"
                />
                <input
                  name="date"
                  type="date"
                  required
                  defaultValue={toDateInputValue(g.date)}
                  className="rounded-lg border border-gray-200 px-2.5 py-1.5 text-[13px]"
                />
              </div>
              <input
                name="notes"
                defaultValue={g.notes ?? ''}
                placeholder="Notes (optional)"
                className="rounded-lg border border-gray-200 px-2.5 py-1.5 text-[13px]"
              />
              <div className="flex gap-2">
                <button
                  type="submit"
                  disabled={isPending}
                  className="rounded-lg bg-evergreen px-3 py-1.5 text-[12px] font-semibold text-white disabled:opacity-60"
                >
                  Save
                </button>
                <button
                  type="button"
                  onClick={() => setEditingId(null)}
                  className="rounded-lg border border-gray-200 px-3 py-1.5 text-[12px] font-semibold text-gray-600"
                >
                  Cancel
                </button>
              </div>
            </form>
          ) : (
            <div key={g.id} className="flex items-center justify-between py-2 text-sm">
              <div>
                <span className="text-gray-700">
                  {new Date(g.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                </span>
                {g.notes && <span className="ml-2 text-xs text-gray-500">{g.notes}</span>}
              </div>
              <div className="flex items-center gap-3">
                <span className="font-semibold text-gray-900">{formatCurrency(g.amount)}</span>
                {canEdit && (
                  <>
                    <button
                      type="button"
                      onClick={() => setEditingId(g.id)}
                      className="text-gray-300 hover:text-evergreen"
                      aria-label="Edit disbursement"
                    >
                      <Pencil size={13} />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(g.id)}
                      className="text-gray-300 hover:text-error"
                      aria-label="Remove disbursement"
                    >
                      <Trash2 size={13} />
                    </button>
                  </>
                )}
              </div>
            </div>
          ),
        )}
      </div>

      {error && <p className="mt-2 text-xs font-medium text-error">{error}</p>}

      {canEdit && (
        <div className="mt-3">
          <RecordDisbursementForm grantId={grantId} grantOpportunityId={grantOpportunityId} />
        </div>
      )}
    </div>
  );
}

'use client';

import { useState, useTransition } from 'react';
import { Trash2, AlertTriangle } from 'lucide-react';
import { purgeAndRebuildSalesforceAction, type PurgeActionState } from '@/lib/actions/salesforce';

export default function PurgeAndRebuildSalesforceForm({ organizationName }: { organizationName: string }) {
  const [showConfirm, setShowConfirm] = useState(false);
  const [typedName, setTypedName] = useState('');
  const [state, setState] = useState<PurgeActionState>(undefined);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData();
    formData.set('confirmation', typedName);
    setState(undefined);
    startTransition(async () => {
      const result = await purgeAndRebuildSalesforceAction(undefined, formData);
      setState(result);
      if (!result?.error) {
        setShowConfirm(false);
        setTypedName('');
      }
    });
  }

  if (!showConfirm) {
    return (
      <button
        type="button"
        onClick={() => setShowConfirm(true)}
        className="flex items-center gap-1.5 text-[13px] font-semibold text-error hover:text-red-700"
      >
        <Trash2 size={14} />
        Purge &amp; Rebuild
      </button>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-xl border border-error/30 bg-error/5 p-4">
      <div className="flex items-start gap-2.5">
        <AlertTriangle size={16} className="mt-0.5 flex-shrink-0 text-error" />
        <div>
          <p className="text-sm font-semibold text-gray-900">
            This deletes every donor, opportunity, and gift Salesforce ever created here &mdash; and
            everything attached to them.
          </p>
          <p className="mt-1 text-sm text-gray-700">
            If a synced donor has since gained a Success Plan, a Grant, or notes added directly in
            Donor Success, <strong>those are deleted too</strong> &mdash; not just the parts that came
            from Salesforce. This cannot be undone. The next sync will rebuild everything from
            Salesforce&rsquo;s current state.
          </p>
        </div>
      </div>

      <label className="mt-4 block text-xs font-semibold text-gray-700">
        Type <span className="font-bold text-gray-900">{organizationName}</span> to confirm
      </label>
      <input
        type="text"
        value={typedName}
        onChange={(e) => setTypedName(e.target.value)}
        className="mt-1.5 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
        autoComplete="off"
      />

      {state?.error && <p className="mt-2 text-xs font-medium text-error">{state.error}</p>}
      {state?.result && (
        <p className="mt-2 text-xs font-medium text-success">
          Deleted {state.result.donorsDeleted} donor{state.result.donorsDeleted === 1 ? '' : 's'},{' '}
          {state.result.opportunitiesDeleted} opportunit{state.result.opportunitiesDeleted === 1 ? 'y' : 'ies'}, and{' '}
          {state.result.giftsDeleted} gift{state.result.giftsDeleted === 1 ? '' : 's'}. The next sync will rebuild from Salesforce.
        </p>
      )}

      <div className="mt-3 flex gap-2">
        <button
          type="submit"
          disabled={isPending || typedName.trim() !== organizationName}
          className="rounded-lg bg-error px-3.5 py-2 text-[13px] font-semibold text-white disabled:opacity-40"
        >
          {isPending ? 'Deleting…' : 'Permanently delete and rebuild'}
        </button>
        <button
          type="button"
          onClick={() => {
            setShowConfirm(false);
            setTypedName('');
          }}
          className="rounded-lg border border-gray-200 px-3.5 py-2 text-[13px] font-semibold text-gray-600"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}

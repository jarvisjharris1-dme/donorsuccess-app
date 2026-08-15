'use client';

import { useState, useTransition } from 'react';
import { CrmProvider, CrmConnectionStatus } from '@prisma/client';
import {
  adminResyncCrmAction,
  adminPurgeAndRebuildCrmAction,
  adminDisconnectCrmAction,
  adminUpdateGivingHistoryFilterAction,
  type ActionState,
  type AdminPurgeState,
} from '@/lib/actions/admin';

export type AdminCrmConnectionData = {
  provider: CrmProvider;
  status: CrmConnectionStatus;
  instanceUrl: string | null;
  lastSyncedAt: string | null;
  lastError: string | null;
  minGivingHistoryYears: number | null;
};

export default function AdminCrmSection({
  organizationId,
  organizationName,
  connection,
}: {
  organizationId: string;
  organizationName: string;
  connection: AdminCrmConnectionData | null;
}) {
  const [message, setMessage] = useState<{ text: string; isError: boolean } | null>(null);
  const [purgeState, setPurgeState] = useState<AdminPurgeState>(undefined);
  const [showPurgeConfirm, setShowPurgeConfirm] = useState(false);
  const [typedName, setTypedName] = useState('');
  const [enabled, setEnabled] = useState((connection?.minGivingHistoryYears ?? null) !== null);
  const [years, setYears] = useState(connection?.minGivingHistoryYears ?? 5);
  const [isPending, startTransition] = useTransition();

  if (!connection) {
    return (
      <div className="mt-6 rounded-[16px] border border-gray-800 bg-gray-800/40 p-6">
        <h2 className="text-[15px] font-bold text-white">CRM Connection</h2>
        <p className="mt-2 text-sm text-gray-500">Not connected. The client can connect from their own Settings page.</p>
      </div>
    );
  }

  function baseFormData() {
    const fd = new FormData();
    fd.set('organizationId', organizationId);
    fd.set('provider', connection!.provider);
    return fd;
  }

  function handleResync() {
    if (!confirm(`Reset the sync bookmark for ${organizationName}? Nothing is deleted — their next sync pulls everything fresh.`)) return;
    setMessage(null);
    startTransition(async () => {
      const result: ActionState = await adminResyncCrmAction(undefined, baseFormData());
      setMessage(result?.error ? { text: result.error, isError: true } : { text: result?.success ?? 'Done.', isError: false });
    });
  }

  function handleDisconnect() {
    if (!confirm(`Disconnect ${connection!.provider} for ${organizationName}? They'll need to reconnect from their own Settings to sync again. Already-synced data is not deleted.`)) return;
    setMessage(null);
    startTransition(async () => {
      const result: ActionState = await adminDisconnectCrmAction(undefined, baseFormData());
      setMessage(result?.error ? { text: result.error, isError: true } : { text: result?.success ?? 'Disconnected.', isError: false });
    });
  }

  function handleFilterSave() {
    const fd = baseFormData();
    fd.set('enabled', String(enabled));
    fd.set('minGivingHistoryYears', String(years));
    setMessage(null);
    startTransition(async () => {
      const result: ActionState = await adminUpdateGivingHistoryFilterAction(undefined, fd);
      setMessage(result?.error ? { text: result.error, isError: true } : { text: result?.success ?? 'Saved.', isError: false });
    });
  }

  function handlePurgeSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = baseFormData();
    fd.set('confirmation', typedName);
    setPurgeState(undefined);
    startTransition(async () => {
      const result = await adminPurgeAndRebuildCrmAction(undefined, fd);
      setPurgeState(result);
      if (!result?.error) {
        setShowPurgeConfirm(false);
        setTypedName('');
      }
    });
  }

  return (
    <div className="mt-6 rounded-[16px] border border-gray-800 bg-gray-800/40 p-6">
      <div className="flex items-center gap-2">
        <span className={`h-2 w-2 rounded-full ${connection.status === 'CONNECTED' ? 'bg-success' : 'bg-error'}`} />
        <h2 className="text-[15px] font-bold text-white">
          {connection.provider} {connection.instanceUrl ? `— ${connection.instanceUrl}` : ''}
        </h2>
      </div>
      <p className="mt-1 text-xs text-gray-500">
        {connection.lastSyncedAt ? `Last synced ${new Date(connection.lastSyncedAt).toLocaleString()}` : 'Never synced yet'}
      </p>
      {connection.lastError && <p className="mt-1 text-xs text-error">{connection.lastError}</p>}

      <div className="mt-4 flex flex-wrap items-center gap-3 border-t border-gray-800 pt-4">
        <button
          type="button"
          onClick={handleResync}
          disabled={isPending}
          className="rounded-lg border border-gray-700 px-3.5 py-2 text-[12.5px] font-semibold text-gray-200 hover:border-gray-600 disabled:opacity-60"
        >
          Resync
        </button>
        <button
          type="button"
          onClick={handleDisconnect}
          disabled={isPending}
          className="rounded-lg border border-gray-700 px-3.5 py-2 text-[12.5px] font-semibold text-gray-200 hover:border-gray-600 disabled:opacity-60"
        >
          Disconnect
        </button>
      </div>

      <div className="mt-4 border-t border-gray-800 pt-4">
        <label className="flex items-center gap-2 text-sm font-medium text-gray-200">
          <input type="checkbox" checked={enabled} onChange={(e) => setEnabled(e.target.checked)} />
          Only sync contacts/accounts with a won gift in the last
        </label>
        {enabled && (
          <div className="mt-2 flex items-center gap-2 pl-6">
            <input
              type="number"
              min={1}
              max={50}
              value={years}
              onChange={(e) => setYears(Number(e.target.value))}
              className="w-20 rounded-lg border border-gray-700 bg-gray-900 px-2.5 py-1.5 text-sm text-white"
            />
            <span className="text-sm text-gray-400">years</span>
          </div>
        )}
        <button
          type="button"
          onClick={handleFilterSave}
          disabled={isPending}
          className="mt-2 rounded-lg bg-evergreen px-3.5 py-1.5 text-[12.5px] font-semibold text-white disabled:opacity-60"
        >
          Save filter
        </button>
      </div>

      {message && (
        <p className={`mt-3 text-xs font-medium ${message.isError ? 'text-error' : 'text-success'}`}>{message.text}</p>
      )}

      <div className="mt-4 border-t border-gray-800 pt-4">
        {!showPurgeConfirm ? (
          <button
            type="button"
            onClick={() => setShowPurgeConfirm(true)}
            className="text-[13px] font-semibold text-error hover:text-red-400"
          >
            Purge &amp; Rebuild
          </button>
        ) : (
          <form onSubmit={handlePurgeSubmit} className="rounded-xl border border-error/30 bg-error/10 p-4">
            <p className="text-sm font-semibold text-white">
              This deletes every donor, opportunity, and gift this connection ever created for{' '}
              {organizationName} — and everything attached to them (tasks, Success Plans, Grants,
              notes). This cannot be undone.
            </p>
            <label className="mt-3 block text-xs font-semibold text-gray-300">
              Type <span className="font-bold text-white">{organizationName}</span> to confirm
            </label>
            <input
              type="text"
              value={typedName}
              onChange={(e) => setTypedName(e.target.value)}
              className="mt-1.5 w-full rounded-lg border border-gray-700 bg-gray-900 px-3 py-2 text-sm text-white"
              autoComplete="off"
            />
            {purgeState?.error && <p className="mt-2 text-xs font-medium text-error">{purgeState.error}</p>}
            {purgeState?.result && (
              <p className="mt-2 text-xs font-medium text-success">
                Deleted {purgeState.result.donorsDeleted} donors, {purgeState.result.opportunitiesDeleted} opportunities,{' '}
                {purgeState.result.giftsDeleted} gifts.
              </p>
            )}
            <div className="mt-3 flex gap-2">
              <button
                type="submit"
                disabled={isPending || typedName.trim() !== organizationName}
                className="rounded-lg bg-error px-3.5 py-2 text-[13px] font-semibold text-white disabled:opacity-40"
              >
                Permanently delete and rebuild
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowPurgeConfirm(false);
                  setTypedName('');
                }}
                className="rounded-lg border border-gray-700 px-3.5 py-2 text-[13px] font-semibold text-gray-300"
              >
                Cancel
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

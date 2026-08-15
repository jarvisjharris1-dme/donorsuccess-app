'use client';

import { useState, useTransition } from 'react';
import { Copy, Check, X } from 'lucide-react';
import { dismissPasswordResetAction, type ActionState } from '@/lib/actions/settings';

export type PendingResetRow = {
  token: string;
  name: string | null;
  email: string;
};

export default function PendingPasswordResets({ resets }: { resets: PendingResetRow[] }) {
  if (resets.length === 0) {
    return <p className="py-4 text-sm text-gray-600">No pending password reset requests.</p>;
  }

  return (
    <div className="flex flex-col divide-y divide-gray-50">
      {resets.map((r) => (
        <PendingResetRowItem key={r.token} reset={r} />
      ))}
    </div>
  );
}

function PendingResetRowItem({ reset }: { reset: PendingResetRow }) {
  const [copied, setCopied] = useState(false);
  const [isPending, startTransition] = useTransition();

  async function handleCopy() {
    const link = `${window.location.origin}/reset-password/${reset.token}`;
    await navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function handleDismiss() {
    const formData = new FormData();
    formData.set('token', reset.token);
    startTransition(async () => {
      const result: ActionState = await dismissPasswordResetAction(undefined, formData);
      if (result?.error) alert(result.error);
    });
  }

  return (
    <div className={`flex flex-wrap items-center justify-between gap-2 py-3 ${isPending ? 'opacity-50' : ''}`}>
      <div>
        <div className="text-sm font-semibold text-gray-900">{reset.name ?? reset.email}</div>
        <div className="mt-0.5 text-xs text-gray-600">{reset.email}</div>
      </div>
      <div className="flex items-center gap-4">
        <button
          type="button"
          onClick={handleCopy}
          className="flex items-center gap-1.5 text-[12.5px] font-semibold text-evergreen"
        >
          {copied ? <Check size={13} /> : <Copy size={13} />}
          {copied ? 'Copied' : 'Copy link'}
        </button>
        <button
          type="button"
          onClick={handleDismiss}
          disabled={isPending}
          className="flex items-center gap-1 text-[12.5px] font-semibold text-gray-600 transition-colors hover:text-error disabled:opacity-60"
        >
          <X size={13} />
          Dismiss
        </button>
      </div>
    </div>
  );
}

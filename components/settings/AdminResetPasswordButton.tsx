'use client';

import { useState, useTransition } from 'react';
import { KeyRound, Copy, Check } from 'lucide-react';
import { adminResetPasswordAction, type ResetLinkState } from '@/lib/actions/settings';

export default function AdminResetPasswordButton({ userId }: { userId: string }) {
  const [link, setLink] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [isPending, startTransition] = useTransition();

  function handleGenerate() {
    if (!confirm('Generate a password reset link for this user? Any previous pending link for them will stop working.')) {
      return;
    }
    const formData = new FormData();
    formData.set('userId', userId);
    setError(null);
    startTransition(async () => {
      const result: ResetLinkState = await adminResetPasswordAction(undefined, formData);
      if (result?.error) setError(result.error);
      else if (result?.token) setLink(`${window.location.origin}/reset-password/${result.token}`);
    });
  }

  async function handleCopy() {
    if (!link) return;
    await navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  if (link) {
    return (
      <button
        type="button"
        onClick={handleCopy}
        className="flex items-center gap-1 text-[12.5px] font-semibold text-evergreen"
      >
        {copied ? <Check size={13} /> : <Copy size={13} />}
        {copied ? 'Copied' : 'Copy reset link'}
      </button>
    );
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        type="button"
        onClick={handleGenerate}
        disabled={isPending}
        className="flex items-center gap-1 text-[12.5px] font-semibold text-gray-600 transition-colors hover:text-evergreen disabled:opacity-60"
      >
        <KeyRound size={13} />
        {isPending ? 'Generating…' : 'Reset password'}
      </button>
      {error && <span className="text-[11px] font-medium text-error">{error}</span>}
    </div>
  );
}

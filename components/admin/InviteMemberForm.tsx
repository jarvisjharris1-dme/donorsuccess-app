'use client';

import { useState, useTransition } from 'react';
import { Copy, Check } from 'lucide-react';
import { inviteMemberToOrgAction, type ActionState } from '@/lib/actions/admin';

export default function InviteMemberForm({ organizationId }: { organizationId: string }) {
  const [error, setError] = useState<string | null>(null);
  const [inviteToken, setInviteToken] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const formData = new FormData(form);
    setError(null);
    startTransition(async () => {
      const result: ActionState = await inviteMemberToOrgAction(undefined, formData);
      if (result?.error) setError(result.error);
      else if (result?.success) {
        setInviteToken(result.success);
        form.reset();
      }
    });
  }

  async function handleCopy() {
    if (!inviteToken) return;
    const link = `${window.location.origin}/accept-invite/${inviteToken}`;
    await navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div>
      <form onSubmit={handleSubmit} className="flex flex-wrap items-end gap-3">
        <input type="hidden" name="organizationId" value={organizationId} />
        <div className="flex-1" style={{ minWidth: 180 }}>
          <label htmlFor="email" className="mb-1.5 block text-[12px] font-semibold text-gray-300">
            Email
          </label>
          <input
            id="email"
            name="email"
            type="email"
            required
            className="w-full rounded-[10px] border border-gray-700 bg-gray-800 px-3 py-2.5 text-sm text-white focus:border-evergreen focus:outline-none focus:ring-2 focus:ring-evergreen/30"
          />
        </div>
        <div>
          <label htmlFor="role" className="mb-1.5 block text-[12px] font-semibold text-gray-300">
            Role
          </label>
          <select
            id="role"
            name="role"
            defaultValue="FUNDRAISER"
            className="rounded-[10px] border border-gray-700 bg-gray-800 px-3 py-2.5 text-sm text-white"
          >
            <option value="ADMIN">Admin</option>
            <option value="FUNDRAISER">Fundraiser</option>
            <option value="VIEWER">Viewer</option>
          </select>
        </div>
        <button
          type="submit"
          disabled={isPending}
          className="rounded-[10px] bg-evergreen px-4 py-2.5 text-[13px] font-semibold text-white transition-colors hover:bg-[#0d685f] disabled:opacity-60"
        >
          {isPending ? 'Sending…' : 'Invite'}
        </button>
      </form>

      {error && <p className="mt-2 text-[13px] font-medium text-red-400">{error}</p>}

      {inviteToken && (
        <div className="mt-3 flex items-center gap-3 rounded-lg bg-evergreen/10 px-3.5 py-2.5">
          <span className="text-[13px] text-gray-200">Invite created and emailed.</span>
          <button
            type="button"
            onClick={handleCopy}
            className="flex items-center gap-1.5 text-[12.5px] font-semibold text-evergreen"
          >
            {copied ? <Check size={13} /> : <Copy size={13} />}
            {copied ? 'Copied' : 'Copy invite link'}
          </button>
        </div>
      )}
    </div>
  );
}

'use client';

import { useTransition } from 'react';
import { X } from 'lucide-react';
import { revokeInvitationAction } from '@/lib/actions/settings';

export default function RevokeInvitationButton({ invitationId }: { invitationId: string }) {
  const [isPending, startTransition] = useTransition();

  function handleClick() {
    if (!confirm('Revoke this invitation?')) return;
    const formData = new FormData();
    formData.set('id', invitationId);
    startTransition(async () => {
      await revokeInvitationAction(undefined, formData);
    });
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={isPending}
      className="flex items-center gap-1 text-[12.5px] font-semibold text-gray-600 transition-colors hover:text-error disabled:opacity-60"
    >
      <X size={13} />
      Revoke
    </button>
  );
}

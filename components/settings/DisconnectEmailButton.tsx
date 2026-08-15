'use client';

import { useTransition } from 'react';
import { disconnectEmailAction, type ActionState } from '@/lib/actions/email-connection';

export default function DisconnectEmailButton() {
  const [isPending, startTransition] = useTransition();

  function handleClick() {
    if (!confirm('Disconnect your email account? You can reconnect any time.')) return;
    startTransition(async () => {
      const result: ActionState = await disconnectEmailAction(undefined, new FormData());
      if (result?.error) alert(result.error);
    });
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={isPending}
      className="text-[12.5px] font-semibold text-gray-600 transition-colors hover:text-error disabled:opacity-60"
    >
      {isPending ? 'Disconnecting…' : 'Disconnect'}
    </button>
  );
}

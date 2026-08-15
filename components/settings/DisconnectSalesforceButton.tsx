'use client';

import { useTransition } from 'react';
import { disconnectSalesforceAction, type ActionState } from '@/lib/actions/salesforce';

export default function DisconnectSalesforceButton() {
  const [isPending, startTransition] = useTransition();

  function handleClick() {
    if (
      !confirm(
        'Disconnect Salesforce? Data already synced into Donor Success will stay, but nothing new will sync until reconnected.',
      )
    ) {
      return;
    }
    startTransition(async () => {
      const result: ActionState = await disconnectSalesforceAction(undefined, new FormData());
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

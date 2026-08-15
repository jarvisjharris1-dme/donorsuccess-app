'use client';

import { useTransition } from 'react';
import { deleteEmailTemplateAction, type ActionState } from '@/lib/actions/email-templates';

export default function DeleteEmailTemplateButton({ id }: { id: string }) {
  const [isPending, startTransition] = useTransition();

  function handleClick() {
    if (!confirm('Delete this template? This cannot be undone.')) return;
    const formData = new FormData();
    formData.set('id', id);
    startTransition(async () => {
      const result: ActionState = await deleteEmailTemplateAction(undefined, formData);
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
      {isPending ? 'Deleting…' : 'Delete'}
    </button>
  );
}

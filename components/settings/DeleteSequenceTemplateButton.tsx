'use client';

import { useTransition } from 'react';
import { Trash2 } from 'lucide-react';
import { deleteSequenceTemplateAction, type ActionState } from '@/lib/actions/sequence-templates';

export default function DeleteSequenceTemplateButton({ id }: { id: string }) {
  const [isPending, startTransition] = useTransition();

  function handleClick() {
    if (!confirm('Delete this sequence template?')) return;
    const formData = new FormData();
    formData.set('id', id);
    startTransition(async () => {
      const result: ActionState = await deleteSequenceTemplateAction(undefined, formData);
      if (result?.error) alert(result.error);
    });
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={isPending}
      className="text-gray-400 hover:text-error disabled:opacity-60"
      aria-label="Delete sequence"
    >
      <Trash2 size={16} />
    </button>
  );
}

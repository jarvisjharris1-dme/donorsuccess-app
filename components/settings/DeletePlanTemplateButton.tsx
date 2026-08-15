'use client';

import { useTransition } from 'react';
import { Trash2 } from 'lucide-react';
import { deletePlanTemplateAction, type ActionState } from '@/lib/actions/plan-templates';

export default function DeletePlanTemplateButton({ id }: { id: string }) {
  const [isPending, startTransition] = useTransition();

  function handleClick() {
    if (!confirm('Delete this plan template?')) return;
    const formData = new FormData();
    formData.set('id', id);
    startTransition(async () => {
      const result: ActionState = await deletePlanTemplateAction(undefined, formData);
      if (result?.error) alert(result.error);
    });
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={isPending}
      className="text-gray-400 hover:text-error disabled:opacity-60"
      aria-label="Delete plan template"
    >
      <Trash2 size={16} />
    </button>
  );
}

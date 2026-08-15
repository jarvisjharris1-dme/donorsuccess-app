'use client';

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Trash2 } from 'lucide-react';
import { deleteGrantOpportunityAction, type ActionState } from '@/lib/actions/grants';

export default function DeleteGrantButton({ id }: { id: string }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function handleClick() {
    if (!confirm('Delete this grant opportunity? This also removes its requirements checklist.')) return;
    const formData = new FormData();
    formData.set('id', id);
    startTransition(async () => {
      const result: ActionState = await deleteGrantOpportunityAction(undefined, formData);
      if (result?.error) alert(result.error);
      else router.push('/grants');
    });
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={isPending}
      className="flex items-center gap-1.5 text-[13px] font-semibold text-gray-500 hover:text-error disabled:opacity-60"
    >
      <Trash2 size={14} />
      Delete
    </button>
  );
}

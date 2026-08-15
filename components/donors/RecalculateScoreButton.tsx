'use client';

import { useTransition } from 'react';
import { RefreshCw } from 'lucide-react';
import { recalculateDonorScoreAction } from '@/lib/actions/scoring';

export default function RecalculateScoreButton({ donorId }: { donorId: string }) {
  const [isPending, startTransition] = useTransition();

  function handleClick() {
    const formData = new FormData();
    formData.set('donorId', donorId);
    startTransition(async () => {
      await recalculateDonorScoreAction(undefined, formData);
    });
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={isPending}
      className="flex items-center gap-1.5 text-[12px] font-semibold text-gray-600 transition-colors hover:text-evergreen disabled:opacity-60"
    >
      <RefreshCw size={12} className={isPending ? 'animate-spin' : ''} />
      {isPending ? 'Recalculating…' : 'Recalculate'}
    </button>
  );
}

'use client';

import { useTransition } from 'react';
import { CommitmentStatus } from '@prisma/client';
import { COMMITMENT_STATUSES, COMMITMENT_STATUS_LABELS, COMMITMENT_STATUS_STYLES } from '@/lib/board-engagement';
import { updateBoardCommitmentStatusAction } from '@/lib/actions/board';

export default function CommitmentStatusSelect({
  id,
  donorId,
  status,
  disabled,
}: {
  id: string;
  donorId: string;
  status: CommitmentStatus;
  disabled: boolean;
}) {
  const [isPending, startTransition] = useTransition();

  function handleChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const formData = new FormData();
    formData.set('id', id);
    formData.set('donorId', donorId);
    formData.set('status', e.target.value);
    startTransition(async () => {
      await updateBoardCommitmentStatusAction(undefined, formData);
    });
  }

  return (
    <select
      value={status}
      onChange={handleChange}
      disabled={disabled || isPending}
      className={`rounded-lg border-0 px-2 py-1 text-[11px] font-semibold ${COMMITMENT_STATUS_STYLES[status]}`}
    >
      {COMMITMENT_STATUSES.map((s) => (
        <option key={s} value={s}>
          {COMMITMENT_STATUS_LABELS[s]}
        </option>
      ))}
    </select>
  );
}

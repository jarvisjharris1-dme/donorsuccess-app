'use client';

import { useTransition } from 'react';
import { IntroductionStatus } from '@prisma/client';
import { INTRODUCTION_STATUSES, INTRODUCTION_STATUS_LABELS, INTRODUCTION_STATUS_STYLES } from '@/lib/board-engagement';
import { updateBoardIntroductionStatusAction } from '@/lib/actions/board';

export default function IntroductionStatusSelect({
  id,
  donorId,
  status,
  disabled,
}: {
  id: string;
  donorId: string;
  status: IntroductionStatus;
  disabled: boolean;
}) {
  const [isPending, startTransition] = useTransition();

  function handleChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const formData = new FormData();
    formData.set('id', id);
    formData.set('donorId', donorId);
    formData.set('status', e.target.value);
    startTransition(async () => {
      await updateBoardIntroductionStatusAction(undefined, formData);
    });
  }

  return (
    <select
      value={status}
      onChange={handleChange}
      disabled={disabled || isPending}
      className={`rounded-lg border-0 px-2 py-1 text-[11px] font-semibold ${INTRODUCTION_STATUS_STYLES[status]}`}
    >
      {INTRODUCTION_STATUSES.map((s) => (
        <option key={s} value={s}>
          {INTRODUCTION_STATUS_LABELS[s]}
        </option>
      ))}
    </select>
  );
}

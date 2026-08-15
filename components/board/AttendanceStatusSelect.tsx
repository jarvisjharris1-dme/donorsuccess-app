'use client';

import { useTransition } from 'react';
import { AttendanceStatus } from '@prisma/client';
import { updateMeetingAttendanceAction } from '@/lib/actions/board';

const STYLES: Record<AttendanceStatus, string> = {
  ATTENDED: 'bg-success/10 text-success',
  EXCUSED: 'bg-warning/10 text-warning',
  ABSENT: 'bg-error/10 text-error',
};

const LABELS: Record<AttendanceStatus, string> = {
  ATTENDED: 'Attended',
  EXCUSED: 'Excused',
  ABSENT: 'Absent',
};

export default function AttendanceStatusSelect({
  id,
  donorId,
  status,
  disabled,
}: {
  id: string;
  donorId: string;
  status: AttendanceStatus;
  disabled: boolean;
}) {
  const [isPending, startTransition] = useTransition();

  function handleChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const formData = new FormData();
    formData.set('id', id);
    formData.set('donorId', donorId);
    formData.set('status', e.target.value);
    startTransition(async () => {
      await updateMeetingAttendanceAction(undefined, formData);
    });
  }

  return (
    <select
      value={status}
      onChange={handleChange}
      disabled={disabled || isPending}
      className={`rounded-lg border-0 px-2 py-1 text-[11px] font-semibold ${STYLES[status]}`}
    >
      {(Object.keys(LABELS) as AttendanceStatus[]).map((s) => (
        <option key={s} value={s}>
          {LABELS[s]}
        </option>
      ))}
    </select>
  );
}

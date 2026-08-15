'use client';

import { useTransition } from 'react';
import { assignDonorAction } from '@/lib/actions/admin';

export default function DonorAssignSelect({
  organizationId,
  donorId,
  currentAssigneeId,
  members,
}: {
  organizationId: string;
  donorId: string;
  currentAssigneeId: string | null;
  members: { id: string; name: string | null; email: string }[];
}) {
  const [isPending, startTransition] = useTransition();

  function handleChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const formData = new FormData();
    formData.set('organizationId', organizationId);
    formData.set('donorId', donorId);
    formData.set('assignedToId', e.target.value);
    startTransition(async () => {
      const result = await assignDonorAction(undefined, formData);
      if (result?.error) alert(result.error);
    });
  }

  return (
    <select
      defaultValue={currentAssigneeId ?? ''}
      onChange={handleChange}
      disabled={isPending}
      className="rounded-lg border border-gray-700 bg-gray-800 px-2.5 py-1.5 text-[12.5px] font-semibold text-white disabled:opacity-60"
    >
      <option value="">Unassigned</option>
      {members.map((m) => (
        <option key={m.id} value={m.id}>
          {m.name ?? m.email}
        </option>
      ))}
    </select>
  );
}

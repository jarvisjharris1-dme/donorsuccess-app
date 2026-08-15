'use client';

import { useTransition } from 'react';
import { updateMemberRoleAction } from '@/lib/actions/admin';

const ROLES = ['OWNER', 'ADMIN', 'FUNDRAISER', 'VIEWER'];

export default function MemberRoleSelect({
  organizationId,
  userId,
  currentRole,
}: {
  organizationId: string;
  userId: string;
  currentRole: string;
}) {
  const [isPending, startTransition] = useTransition();

  function handleChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const formData = new FormData();
    formData.set('organizationId', organizationId);
    formData.set('userId', userId);
    formData.set('role', e.target.value);
    startTransition(async () => {
      const result = await updateMemberRoleAction(undefined, formData);
      if (result?.error) alert(result.error);
    });
  }

  return (
    <select
      defaultValue={currentRole}
      onChange={handleChange}
      disabled={isPending}
      className="rounded-lg border border-gray-700 bg-gray-800 px-2.5 py-1.5 text-[12.5px] font-semibold text-white disabled:opacity-60"
    >
      {ROLES.map((r) => (
        <option key={r} value={r}>
          {r.charAt(0) + r.slice(1).toLowerCase()}
        </option>
      ))}
    </select>
  );
}

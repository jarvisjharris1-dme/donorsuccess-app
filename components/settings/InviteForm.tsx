'use client';

import { useState, useTransition } from 'react';
import { Role } from '@prisma/client';
import SubmitButton from '@/components/SubmitButton';
import { inviteUserAction, type ActionState } from '@/lib/actions/settings';

const ROLE_LABELS: Record<Role, string> = {
  OWNER: 'Owner',
  ADMIN: 'Admin',
  FUNDRAISER: 'Fundraiser',
  VIEWER: 'Viewer',
  // Not yet a real, usable role — there's no board portal to log into
  // yet, so inviting someone into it today would just create a
  // confusing, functionally undefined account. Label exists here only
  // so this Record type stays complete; deliberately excluded from
  // INVITABLE_ROLES below.
  BOARD_MEMBER: 'Board Member (portal not yet available)',
};

// Admins can invite anyone except another Owner — Owner access is
// granted separately via the role-change control once someone's in.
// BOARD_MEMBER is deliberately excluded — see the comment above.
const INVITABLE_ROLES: Role[] = [Role.ADMIN, Role.FUNDRAISER, Role.VIEWER];

export default function InviteForm() {
  const [message, setMessage] = useState<{ type: 'error' | 'success'; text: string } | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const formData = new FormData(form);
    setMessage(null);
    startTransition(async () => {
      const result: ActionState = await inviteUserAction(undefined, formData);
      if (result?.error) setMessage({ type: 'error', text: result.error });
      else if (result?.success) {
        setMessage({ type: 'success', text: result.success });
        form.reset();
      }
    });
  }

  const inputClasses =
    'w-full rounded-[10px] border border-gray-200 px-3.5 py-3 text-sm focus:border-teal focus:outline-none focus:ring-2 focus:ring-teal/20';

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4 sm:flex-row sm:items-end sm:gap-3">
      <div className="flex-1">
        <label htmlFor="email" className="mb-1.5 block text-[13px] font-semibold text-gray-900">
          Email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          required
          placeholder="teammate@yourorg.org"
          className={inputClasses}
        />
      </div>
      <div className="w-full sm:w-44">
        <label htmlFor="role" className="mb-1.5 block text-[13px] font-semibold text-gray-900">
          Role
        </label>
        <select id="role" name="role" defaultValue={Role.FUNDRAISER} className={inputClasses}>
          {INVITABLE_ROLES.map((r) => (
            <option key={r} value={r}>
              {ROLE_LABELS[r]}
            </option>
          ))}
        </select>
      </div>
      <SubmitButton pending={isPending}>Send invite</SubmitButton>

      {message && (
        <p
          className={`w-full text-sm font-medium ${message.type === 'error' ? 'text-red-600' : 'text-success'} sm:basis-full`}
        >
          {message.text}
        </p>
      )}
    </form>
  );
}

'use client';

import { useTransition } from 'react';
import { Role, GrantRole } from '@prisma/client';
import { updateUserRoleAction, updateUserGrantRoleAction, toggleUserActiveAction } from '@/lib/actions/settings';
import { GRANT_ROLE_LABELS } from '@/lib/grant-permissions';
import AdminResetPasswordButton from './AdminResetPasswordButton';

const ROLE_LABELS: Record<Role, string> = {
  OWNER: 'Owner',
  ADMIN: 'Admin',
  FUNDRAISER: 'Fundraiser',
  VIEWER: 'Viewer',
  // Not a real, usable role yet — no board portal exists to log into.
  // Label exists only so this Record type stays complete; excluded
  // from ASSIGNABLE_ROLES below, so it can't actually be selected in
  // the change-role dropdown.
  BOARD_MEMBER: 'Board Member (portal not yet available)',
};

const ASSIGNABLE_ROLES: Role[] = [Role.OWNER, Role.ADMIN, Role.FUNDRAISER, Role.VIEWER];

export type MemberRow = {
  id: string;
  name: string | null;
  email: string;
  role: Role;
  grantRole: GrantRole | null;
  isActive: boolean;
  isSelf: boolean;
};

export default function TeamMemberRow({
  member,
  canManage,
  currentUserRole,
}: {
  member: MemberRow;
  canManage: boolean;
  currentUserRole: Role;
}) {
  const [isPending, startTransition] = useTransition();
  const canEditRole = canManage && !member.isSelf;
  const canManageOwnerRole = currentUserRole === Role.OWNER;

  function handleRoleChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const formData = new FormData();
    formData.set('userId', member.id);
    formData.set('role', e.target.value);
    startTransition(async () => {
      await updateUserRoleAction(undefined, formData);
    });
  }

  function handleGrantRoleChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const formData = new FormData();
    formData.set('userId', member.id);
    formData.set('grantRole', e.target.value);
    startTransition(async () => {
      await updateUserGrantRoleAction(undefined, formData);
    });
  }

  function handleToggleActive() {
    if (member.isActive && !confirm(`Deactivate ${member.name ?? member.email}?`)) return;
    const formData = new FormData();
    formData.set('userId', member.id);
    formData.set('active', String(!member.isActive));
    startTransition(async () => {
      await toggleUserActiveAction(undefined, formData);
    });
  }

  return (
    <tr className={`border-b border-gray-50 last:border-0 ${isPending ? 'opacity-50' : ''}`}>
      <td className="px-5 py-3.5">
        <div className="text-sm font-semibold text-gray-900">
          {member.name ?? member.email}
          {member.isSelf && <span className="ml-1.5 text-xs font-normal text-gray-600">(you)</span>}
        </div>
        <div className="text-xs text-gray-600">{member.email}</div>
      </td>
      <td className="px-5 py-3.5">
        {canEditRole && (member.role !== Role.OWNER || canManageOwnerRole) ? (
          <select
            value={member.role}
            onChange={handleRoleChange}
            disabled={isPending}
            className="rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-gray-900 focus:border-teal focus:outline-none"
          >
            {ASSIGNABLE_ROLES.map((r) => (
              <option key={r} value={r} disabled={r === Role.OWNER && !canManageOwnerRole}>
                {ROLE_LABELS[r]}
              </option>
            ))}
          </select>
        ) : (
          <span className="rounded-full bg-gray-100 px-2.5 py-1 text-[11px] font-semibold text-gray-600">
            {ROLE_LABELS[member.role]}
          </span>
        )}
      </td>
      <td className="px-5 py-3.5">
        {canEditRole ? (
          <select
            value={member.grantRole ?? ''}
            onChange={handleGrantRoleChange}
            disabled={isPending}
            className="rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-gray-900 focus:border-teal focus:outline-none"
          >
            <option value="">None</option>
            {Object.values(GrantRole).map((gr) => (
              <option key={gr} value={gr}>
                {GRANT_ROLE_LABELS[gr]}
              </option>
            ))}
          </select>
        ) : member.grantRole ? (
          <span className="rounded-full bg-teal/10 px-2.5 py-1 text-[11px] font-semibold text-evergreen">
            {GRANT_ROLE_LABELS[member.grantRole]}
          </span>
        ) : (
          <span className="text-xs text-gray-400">—</span>
        )}
      </td>
      <td className="px-5 py-3.5">
        <span
          className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-semibold ${
            member.isActive ? 'bg-success/10 text-success' : 'bg-gray-100 text-gray-500'
          }`}
        >
          {member.isActive ? 'Active' : 'Deactivated'}
        </span>
      </td>
      <td className="px-5 py-3.5 text-right">
        <div className="flex items-center justify-end gap-4">
          {canManage && !member.isSelf && <AdminResetPasswordButton userId={member.id} />}
          {canManage && !member.isSelf && (
            <button
              type="button"
              onClick={handleToggleActive}
              disabled={isPending}
              className="text-[12.5px] font-semibold text-gray-600 transition-colors hover:text-error disabled:opacity-60"
            >
              {member.isActive ? 'Deactivate' : 'Reactivate'}
            </button>
          )}
        </div>
      </td>
    </tr>
  );
}

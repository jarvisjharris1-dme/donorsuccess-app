'use client';

import { useState, useTransition } from 'react';
import { Role } from '@prisma/client';
import { navItems } from '@/lib/nav';
import { saveNavVisibilityAction, type ActionState } from '@/lib/actions/nav-visibility';

const CONFIGURABLE_ROLES: Role[] = [Role.ADMIN, Role.FUNDRAISER, Role.VIEWER, Role.BOARD_MEMBER];

const ROLE_LABELS: Record<Role, string> = {
  OWNER: 'Owner',
  ADMIN: 'Admin',
  FUNDRAISER: 'Fundraiser',
  VIEWER: 'Viewer',
  BOARD_MEMBER: 'Board Member',
};

export default function NavVisibilityForm({ initiallyHidden }: { initiallyHidden: Record<Role, string[]> }) {
  const [hidden, setHidden] = useState<Record<Role, Set<string>>>(() => {
    const initial = {} as Record<Role, Set<string>>;
    for (const role of CONFIGURABLE_ROLES) {
      initial[role] = new Set(initiallyHidden[role] ?? []);
    }
    return initial;
  });
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function toggle(role: Role, href: string) {
    setHidden((prev) => {
      const next = { ...prev, [role]: new Set(prev[role]) };
      if (next[role].has(href)) next[role].delete(href);
      else next[role].add(href);
      return next;
    });
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData();
    for (const role of CONFIGURABLE_ROLES) {
      for (const href of hidden[role]) {
        formData.set(`hidden__${role}__${href}`, 'true');
      }
    }
    setMessage(null);
    startTransition(async () => {
      const result: ActionState = await saveNavVisibilityAction(undefined, formData);
      setMessage(result?.error ?? result?.success ?? null);
    });
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
      <div className="overflow-x-auto rounded-[16px] border border-gray-200 bg-white">
        <table className="w-full border-collapse text-left text-sm">
          <thead>
            <tr className="border-b border-gray-100 text-xs font-semibold uppercase tracking-wide text-gray-600">
              <th className="px-4 py-3">Nav item</th>
              {CONFIGURABLE_ROLES.map((role) => (
                <th key={role} className="px-4 py-3 text-center">
                  {ROLE_LABELS[role]}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {navItems.map((item) => (
              <tr key={item.href} className="border-b border-gray-50 last:border-0">
                <td className="px-4 py-2.5 font-medium text-gray-900">{item.label}</td>
                {CONFIGURABLE_ROLES.map((role) => (
                  <td key={role} className="px-4 py-2.5 text-center">
                    <input
                      type="checkbox"
                      checked={!hidden[role].has(item.href)}
                      onChange={() => toggle(role, item.href)}
                      aria-label={`Show ${item.label} for ${ROLE_LABELS[role]}`}
                    />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="text-xs text-gray-500">
        Checked means visible. Owner always sees every item and isn&rsquo;t configurable here, so the
        settings needed to undo a mistake are never hidden from everyone at once.
      </p>

      {message && <p className="text-sm font-medium text-gray-900">{message}</p>}

      <div>
        <button
          type="submit"
          disabled={isPending}
          className="rounded-xl bg-evergreen px-5 py-3 text-[14px] font-semibold text-white transition-all hover:-translate-y-0.5 hover:bg-[#0d685f] disabled:opacity-60"
        >
          {isPending ? 'Saving…' : 'Save changes'}
        </button>
      </div>
    </form>
  );
}

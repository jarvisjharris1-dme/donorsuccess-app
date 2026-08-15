import { redirect } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { auth } from '@/auth';
import { forOrg } from '@/lib/tenant-db';
import { permissions } from '@/lib/permissions';
import { Role } from '@prisma/client';
import NavVisibilityForm from '@/components/settings/NavVisibilityForm';

const CONFIGURABLE_ROLES: Role[] = [Role.ADMIN, Role.FUNDRAISER, Role.VIEWER, Role.BOARD_MEMBER];

export default async function NavVisibilitySettingsPage() {
  const session = await auth();
  if (!permissions.canManageOrgSettings(session!.user.role as Role)) {
    redirect('/settings');
  }

  const db = forOrg(session!.user.organizationId);
  const rows = await db.hiddenNavItem.findMany({ select: { role: true, navHref: true } });

  const initiallyHidden = {} as Record<Role, string[]>;
  for (const role of CONFIGURABLE_ROLES) initiallyHidden[role] = [];
  for (const row of rows) {
    const roleKey = row.role as keyof typeof initiallyHidden;
    if (initiallyHidden[roleKey]) initiallyHidden[roleKey].push(row.navHref);
  }

  return (
    <div className="max-w-3xl">
      <Link href="/settings" className="flex items-center gap-1.5 text-[13px] font-semibold text-gray-600 hover:text-gray-900">
        <ArrowLeft size={14} />
        Settings
      </Link>

      <h1 className="mt-2 text-2xl font-extrabold text-gray-900">Navigation</h1>
      <p className="mt-1 text-sm text-gray-600">
        Choose which sections of the app each role can see in the main navigation. This only hides
        the link — it doesn&rsquo;t change what a role can actually do if they reach a page directly, so
        pair this with the right base role for anything that genuinely shouldn&rsquo;t be touched.
      </p>

      <div className="mt-6">
        <NavVisibilityForm initiallyHidden={initiallyHidden} />
      </div>
    </div>
  );
}

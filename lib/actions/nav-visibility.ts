'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { Role } from '@prisma/client';
import { auth } from '@/auth';
import { forOrg } from '@/lib/tenant-db';
import { assertRole } from '@/lib/permissions';
import { navItems } from '@/lib/nav';

export type ActionState = { error?: string; success?: string } | undefined;

const CONFIGURABLE_ROLES: Role[] = [Role.ADMIN, Role.FUNDRAISER, Role.VIEWER, Role.BOARD_MEMBER];

export async function saveNavVisibilityAction(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  const session = await auth();
  if (!session) redirect('/login');
  assertRole(session.user.role as Role, Role.ADMIN);

  const db = forOrg(session.user.organizationId);

  const rowsToCreate: { organizationId: string; role: Role; navHref: string }[] = [];
  for (const role of CONFIGURABLE_ROLES) {
    for (const item of navItems) {
      const fieldName = `hidden__${role}__${item.href}`;
      if (formData.get(fieldName) === 'true') {
        rowsToCreate.push({ organizationId: session.user.organizationId, role, navHref: item.href });
      }
    }
  }

  await db.hiddenNavItem.deleteMany({});
  if (rowsToCreate.length > 0) {
    await db.hiddenNavItem.createMany({ data: rowsToCreate });
  }

  revalidatePath('/settings/navigation');
  revalidatePath('/', 'layout');
  return { success: 'Saved. Changes apply the next time each affected role loads a page.' };
}

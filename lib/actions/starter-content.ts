'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { Role } from '@prisma/client';
import { auth } from '@/auth';
import { forOrg } from '@/lib/tenant-db';
import { assertRole } from '@/lib/permissions';
import { createStarterContent } from '@/lib/provisioning/starter-content';

export type ActionState = { error?: string; success?: string } | undefined;

export async function loadStarterContentAction(
  _prevState: ActionState,
  _formData: FormData,
): Promise<ActionState> {
  const session = await auth();
  if (!session) redirect('/login');
  assertRole(session.user.role as Role, Role.ADMIN);

  const db = forOrg(session.user.organizationId);
  const result = await createStarterContent(db, session.user.organizationId);

  revalidatePath('/settings/email-templates');
  revalidatePath('/settings/sequence-templates');
  revalidatePath('/settings/plan-templates');

  if (result.templatesCreated === 0 && result.sequencesCreated === 0 && result.planTemplatesCreated === 0) {
    return { success: 'Already up to date — all starter content already existed.' };
  }
  return {
    success: `Added ${result.templatesCreated} email template${result.templatesCreated === 1 ? '' : 's'}, ${result.sequencesCreated} sequence${result.sequencesCreated === 1 ? '' : 's'}, and ${result.planTemplatesCreated} plan template${result.planTemplatesCreated === 1 ? '' : 's'}.`,
  };
}

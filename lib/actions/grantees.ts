'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { Role, GrantRole } from '@prisma/client';
import { auth } from '@/auth';
import { forOrg } from '@/lib/tenant-db';
import { assertGrantCapability } from '@/lib/grant-permissions';
import { granteeSchema } from '@/lib/validation';

export type ActionState = { error?: string; success?: string } | undefined;

export async function saveGranteeAction(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const session = await auth();
  if (!session) redirect('/login');
  assertGrantCapability(session.user.role as Role, session.user.grantRole as GrantRole | null, 'MANAGE_APPLICATIONS');

  const parsed = granteeSchema.safeParse({
    legalName: formData.get('legalName'),
    ein: formData.get('ein'),
    contactName: formData.get('contactName'),
    contactEmail: formData.get('contactEmail'),
    contactPhone: formData.get('contactPhone'),
    addressLine1: formData.get('addressLine1'),
    addressLine2: formData.get('addressLine2'),
    city: formData.get('city'),
    state: formData.get('state'),
    postalCode: formData.get('postalCode'),
    missionSummary: formData.get('missionSummary'),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Check the form for errors.' };
  }

  const db = forOrg(session.user.organizationId);

  const id = formData.get('id');
  const isUpdate = typeof id === 'string' && id.length > 0;

  const grantee = isUpdate
    ? await db.grantee.update({ where: { id }, data: parsed.data })
    : await db.grantee.create({
        data: { ...parsed.data, organizationId: session.user.organizationId },
      });

  revalidatePath('/grantees');
  revalidatePath(`/grantees/${grantee.id}`);
  redirect(`/grantees/${grantee.id}`);
}

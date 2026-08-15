'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { Role, AffiliationType } from '@prisma/client';
import { auth } from '@/auth';
import { forOrg } from '@/lib/tenant-db';
import { assertRole } from '@/lib/permissions';

export type ActionState = { error?: string; success?: string } | undefined;

const affiliationSchema = z.object({
  affiliateName: z.string().trim().min(1, 'Give this affiliation a name'),
  affiliationType: z
    .union([z.nativeEnum(AffiliationType), z.literal('')])
    .optional()
    .nullable()
    .transform((v) => (v ? v : undefined)),
  roleTitle: z.string().trim().optional().nullable().transform((v) => (v ? v : undefined)),
  notes: z.string().trim().optional().nullable().transform((v) => (v ? v : undefined)),
  affiliatedDonorId: z.string().optional().nullable().transform((v) => (v ? v : undefined)),
});

export async function saveDonorAffiliationAction(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const session = await auth();
  if (!session) redirect('/login');
  assertRole(session.user.role as Role, Role.FUNDRAISER);

  const donorId = formData.get('donorId');
  if (typeof donorId !== 'string' || !donorId) {
    return { error: 'Missing donor.' };
  }

  const parsed = affiliationSchema.safeParse({
    affiliateName: formData.get('affiliateName'),
    affiliationType: formData.get('affiliationType'),
    roleTitle: formData.get('roleTitle'),
    notes: formData.get('notes'),
    affiliatedDonorId: formData.get('affiliatedDonorId'),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Check the form for errors.' };
  }

  const db = forOrg(session.user.organizationId);
  const donor = await db.donor.findUnique({ where: { id: donorId } });
  if (!donor) return { error: 'Donor not found.' };

  if (parsed.data.affiliatedDonorId) {
    if (parsed.data.affiliatedDonorId === donorId) {
      return { error: "A donor can't be affiliated with themselves." };
    }
    const linked = await db.donor.findUnique({ where: { id: parsed.data.affiliatedDonorId } });
    if (!linked) return { error: 'Selected linked donor was not found.' };
  }

  const data = { ...parsed.data, donorId };
  const id = formData.get('id');

  if (typeof id === 'string' && id) {
    const existing = await db.donorAffiliation.findUnique({ where: { id } });
    if (!existing) return { error: 'Affiliation not found.' };
    await db.donorAffiliation.update({ where: { id }, data });
  } else {
    await db.donorAffiliation.create({ data: { ...data, organizationId: session.user.organizationId } });
  }

  revalidatePath(`/donors/${donorId}`);
  return { success: 'Affiliation saved.' };
}

export async function deleteDonorAffiliationAction(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const session = await auth();
  if (!session) redirect('/login');
  assertRole(session.user.role as Role, Role.FUNDRAISER);

  const id = formData.get('id');
  const donorId = formData.get('donorId');
  if (typeof id !== 'string' || !id || typeof donorId !== 'string' || !donorId) {
    return { error: 'Missing affiliation.' };
  }

  const db = forOrg(session.user.organizationId);
  await db.donorAffiliation.delete({ where: { id } });

  revalidatePath(`/donors/${donorId}`);
  return { success: 'Affiliation removed.' };
}

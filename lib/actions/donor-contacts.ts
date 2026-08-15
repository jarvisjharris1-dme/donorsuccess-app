'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { Role, ContactType, EngagementStyle } from '@prisma/client';
import { auth } from '@/auth';
import { forOrg } from '@/lib/tenant-db';
import { assertRole } from '@/lib/permissions';

export type ActionState = { error?: string; success?: string } | undefined;

const contactSchema = z.object({
  firstName: z.string().trim().min(1, 'First name is required'),
  lastName: z.string().trim().min(1, 'Last name is required'),
  title: z.string().trim().optional().nullable().transform((v) => (v ? v : undefined)),
  email: z
    .union([z.string().trim().email(), z.literal('')])
    .optional()
    .nullable()
    .transform((v) => (v ? v : undefined)),
  phone: z.string().trim().optional().nullable().transform((v) => (v ? v : undefined)),
  contactType: z
    .union([z.nativeEnum(ContactType), z.literal('')])
    .optional()
    .nullable()
    .transform((v) => (v ? v : undefined)),
  engagementStyle: z
    .union([z.nativeEnum(EngagementStyle), z.literal('')])
    .optional()
    .nullable()
    .transform((v) => (v ? v : undefined)),
  notes: z.string().trim().optional().nullable().transform((v) => (v ? v : undefined)),
});

export async function saveDonorContactAction(
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

  const parsed = contactSchema.safeParse({
    firstName: formData.get('firstName'),
    lastName: formData.get('lastName'),
    title: formData.get('title'),
    email: formData.get('email'),
    phone: formData.get('phone'),
    contactType: formData.get('contactType'),
    engagementStyle: formData.get('engagementStyle'),
    notes: formData.get('notes'),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Check the form for errors.' };
  }

  const db = forOrg(session.user.organizationId);
  const donor = await db.donor.findUnique({ where: { id: donorId } });
  if (!donor) return { error: 'Donor not found.' };

  const id = formData.get('id');
  const isPrimary = formData.get('isPrimary') === 'on';

  // Only one primary contact per donor — clear any existing one first
  // rather than requiring the UI to manage that invariant itself.
  if (isPrimary) {
    await db.donorContact.updateMany({ where: { donorId }, data: { isPrimary: false } });
  }

  const data = { ...parsed.data, donorId, isPrimary };

  if (typeof id === 'string' && id) {
    const existing = await db.donorContact.findUnique({ where: { id } });
    if (!existing) return { error: 'Contact not found.' };
    await db.donorContact.update({ where: { id }, data });
  } else {
    await db.donorContact.create({ data: { ...data, organizationId: session.user.organizationId } });
  }

  revalidatePath(`/donors/${donorId}`);
  return { success: 'Contact saved.' };
}

export async function deleteDonorContactAction(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const session = await auth();
  if (!session) redirect('/login');
  assertRole(session.user.role as Role, Role.FUNDRAISER);

  const id = formData.get('id');
  const donorId = formData.get('donorId');
  if (typeof id !== 'string' || !id || typeof donorId !== 'string' || !donorId) {
    return { error: 'Missing contact.' };
  }

  const db = forOrg(session.user.organizationId);
  await db.donorContact.delete({ where: { id } });

  revalidatePath(`/donors/${donorId}`);
  return { success: 'Contact removed.' };
}

'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { Role } from '@prisma/client';
import { auth } from '@/auth';
import { forOrg } from '@/lib/tenant-db';
import { assertRole } from '@/lib/permissions';
import { donorSchema, executiveSummarySchema } from '@/lib/validation';

export type ActionState = { error?: string } | undefined;

function parseDonorForm(formData: FormData) {
  const tagsRaw = formData.get('tags');
  const tags =
    typeof tagsRaw === 'string' && tagsRaw.trim().length > 0
      ? tagsRaw
          .split(',')
          .map((t) => t.trim())
          .filter(Boolean)
      : [];

  return donorSchema.safeParse({
    donorType: formData.get('donorType'),
    firstName: formData.get('firstName'),
    lastName: formData.get('lastName'),
    organizationName: formData.get('organizationName'),
    email: formData.get('email'),
    phone: formData.get('phone'),
    addressLine1: formData.get('addressLine1'),
    addressLine2: formData.get('addressLine2'),
    city: formData.get('city'),
    state: formData.get('state'),
    postalCode: formData.get('postalCode'),
    country: formData.get('country'),
    assignedToId: formData.get('assignedToId'),
    segment: formData.get('segment'),
    tags,
  });
}

/**
 * Handles both create and edit: the form includes a hidden `id` field
 * when editing, which routes this to an update instead of a create. Keeps
 * the donor form component and its client-side submit handling identical
 * between /donors/new and /donors/[id]/edit.
 */
export async function saveDonorAction(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const session = await auth();
  if (!session) redirect('/login');
  assertRole(session.user.role as Role, Role.FUNDRAISER);

  const parsed = parseDonorForm(formData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Check the form for errors.' };
  }

  const db = forOrg(session.user.organizationId);
  const donorId = formData.get('id');

  // organizationId is only strictly required for the create branch below
  // (Prisma's generated type requires it even though forOrg() injects it
  // at runtime) — including it here is a harmless no-op on update.
  const data = { ...parsed.data, organizationId: session.user.organizationId };

  const donor =
    typeof donorId === 'string' && donorId.length > 0
      ? await db.donor.update({ where: { id: donorId }, data })
      : await db.donor.create({ data });

  revalidatePath('/donors');
  revalidatePath(`/donors/${donor.id}`);
  redirect(`/donors/${donor.id}`);
}

export async function deleteDonorAction(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const session = await auth();
  if (!session) redirect('/login');
  assertRole(session.user.role as Role, Role.ADMIN);

  const donorId = formData.get('id');
  if (typeof donorId !== 'string' || !donorId) {
    return { error: 'Missing donor id.' };
  }

  const db = forOrg(session.user.organizationId);
  await db.donor.delete({ where: { id: donorId } });

  revalidatePath('/donors');
  redirect('/donors');
}

/**
 * Updates just the executive summary — a short brief a fundraiser keeps
 * current so an ED or board member can read it right before a call.
 * Separate from saveDonorAction so it can be edited inline on the donor
 * page without touching (or requiring re-validation of) every other
 * donor field.
 */
export async function updateExecutiveSummaryAction(
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

  const parsed = executiveSummarySchema.safeParse({
    executiveSummary: formData.get('executiveSummary'),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Check the summary text.' };
  }

  const db = forOrg(session.user.organizationId);
  await db.donor.update({
    where: { id: donorId },
    data: { executiveSummary: parsed.data.executiveSummary ?? null },
  });

  revalidatePath(`/donors/${donorId}`);
}

'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { Role, RetentionRisk } from '@prisma/client';
import { auth } from '@/auth';
import { forOrg } from '@/lib/tenant-db';
import { assertRole } from '@/lib/permissions';

export type ActionState = { error?: string; success?: string } | undefined;

const templateSchema = z.object({
  name: z.string().trim().min(1, 'Name is required'),
  subject: z.string().trim().min(1, 'Subject is required'),
  body: z.string().trim().min(1, 'Body is required'),
  suggestedForRisk: z.union([z.nativeEnum(RetentionRisk), z.literal('')]).optional(),
  campaignId: z.string().optional(),
});

export async function saveEmailTemplateAction(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const session = await auth();
  if (!session) redirect('/login');
  assertRole(session.user.role as Role, Role.ADMIN);

  const parsed = templateSchema.safeParse({
    name: formData.get('name'),
    subject: formData.get('subject'),
    body: formData.get('body'),
    suggestedForRisk: formData.get('suggestedForRisk'),
    campaignId: formData.get('campaignId'),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Check the form for errors.' };
  }

  const db = forOrg(session.user.organizationId);
  const id = formData.get('id');

  const data = {
    name: parsed.data.name,
    subject: parsed.data.subject,
    body: parsed.data.body,
    suggestedForRisk: parsed.data.suggestedForRisk || null,
    campaignId: parsed.data.campaignId || null,
  };

  if (typeof id === 'string' && id) {
    const existing = await db.emailTemplate.findUnique({ where: { id } });
    if (!existing) return { error: 'Template not found.' };
    await db.emailTemplate.update({ where: { id }, data });
  } else {
    await db.emailTemplate.create({
      data: { ...data, organizationId: session.user.organizationId },
    });
  }

  revalidatePath('/settings/email-templates');
  redirect('/settings/email-templates');
}

export async function deleteEmailTemplateAction(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const session = await auth();
  if (!session) redirect('/login');
  assertRole(session.user.role as Role, Role.ADMIN);

  const id = formData.get('id');
  if (typeof id !== 'string' || !id) return { error: 'Missing template.' };

  const db = forOrg(session.user.organizationId);

  // Restrict at the DB level (SequenceTemplateStep.emailTemplate) —
  // checked here first for a clear, specific message instead of a raw
  // foreign-key error.
  const usedInSequenceCount = await db.sequenceTemplateStep.count({ where: { emailTemplateId: id } });
  if (usedInSequenceCount > 0) {
    return {
      error: 'This template is used in a success sequence — remove it from that sequence first.',
    };
  }

  await db.emailTemplate.delete({ where: { id } });

  revalidatePath('/settings/email-templates');
  return { success: 'Template deleted.' };
}

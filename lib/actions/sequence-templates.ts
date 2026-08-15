'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { Role, RetentionRisk } from '@prisma/client';
import { auth } from '@/auth';
import { forOrg } from '@/lib/tenant-db';
import { assertRole } from '@/lib/permissions';

export type ActionState = { error?: string; success?: string } | undefined;

const stepSchema = z.object({
  emailTemplateId: z.string().min(1),
  dayOffset: z.coerce.number().int().min(0, 'Day offset can\u2019t be negative'),
});

const templateSchema = z.object({
  name: z.string().trim().min(1, 'Give this sequence a name'),
  description: z.string().trim().optional().nullable().transform((v) => (v ? v : undefined)),
  suggestedForRisk: z
    .union([z.nativeEnum(RetentionRisk), z.literal('')])
    .optional()
    .nullable()
    .transform((v) => (v ? v : undefined)),
  steps: z.array(stepSchema).min(1, 'Add at least one step'),
});

/**
 * Steps are always fully replaced, not incrementally patched — the
 * template edit form is the single source of truth for the step list
 * each time it's saved, same reasoning as Campaign.assignedFundraisers.
 * Existing enrollments aren't affected by this: DonorSequenceStepLog
 * records what was actually sent regardless of later template edits,
 * and currentStepOrder just keeps pointing at whatever step index is
 * next — if steps are reordered/removed after someone's mid-sequence,
 * the next step they see may shift, which is a real but acceptable
 * edge case for a v1.
 */
export async function saveSequenceTemplateAction(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const session = await auth();
  if (!session) redirect('/login');
  assertRole(session.user.role as Role, Role.ADMIN);

  const stepsRaw = formData.get('stepsJson');
  let stepsParsed: unknown;
  try {
    stepsParsed = JSON.parse(typeof stepsRaw === 'string' ? stepsRaw : '[]');
  } catch {
    return { error: 'Could not read the step list — try again.' };
  }

  const parsed = templateSchema.safeParse({
    name: formData.get('name'),
    description: formData.get('description'),
    suggestedForRisk: formData.get('suggestedForRisk'),
    steps: stepsParsed,
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Check the form for errors.' };
  }

  const db = forOrg(session.user.organizationId);
  const id = formData.get('id');
  const isUpdate = typeof id === 'string' && id.length > 0;

  const { steps, ...templateData } = parsed.data;

  const template = isUpdate
    ? await db.sequenceTemplate.update({ where: { id }, data: templateData })
    : await db.sequenceTemplate.create({
        data: { ...templateData, organizationId: session.user.organizationId },
      });

  if (isUpdate) {
    await db.sequenceTemplateStep.deleteMany({ where: { sequenceTemplateId: template.id } });
  }
  await db.sequenceTemplateStep.createMany({
    data: steps.map((s, index) => ({
      organizationId: session.user.organizationId,
      sequenceTemplateId: template.id,
      emailTemplateId: s.emailTemplateId,
      dayOffset: s.dayOffset,
      sortOrder: index,
    })),
  });

  revalidatePath('/settings/sequence-templates');
  redirect('/settings/sequence-templates');
}

export async function deleteSequenceTemplateAction(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const session = await auth();
  if (!session) redirect('/login');
  assertRole(session.user.role as Role, Role.ADMIN);

  const id = formData.get('id');
  if (typeof id !== 'string' || !id) return { error: 'Missing template.' };

  const db = forOrg(session.user.organizationId);

  // Restrict at the DB level (see schema comment) — checked here first
  // so the person gets a clear, specific message instead of a raw
  // foreign-key error.
  const enrollmentCount = await db.donorSequenceEnrollment.count({ where: { sequenceTemplateId: id } });
  if (enrollmentCount > 0) {
    return {
      error: `${enrollmentCount} donor${enrollmentCount === 1 ? ' has' : 's have'} been enrolled in this sequence — it can\u2019t be deleted, only new enrollments can be prevented by not suggesting it further.`,
    };
  }

  await db.sequenceTemplateStep.deleteMany({ where: { sequenceTemplateId: id } });
  await db.sequenceTemplate.delete({ where: { id } });

  revalidatePath('/settings/sequence-templates');
  return { success: 'Sequence deleted.' };
}

'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { Role } from '@prisma/client';
import { auth } from '@/auth';
import { forOrg } from '@/lib/tenant-db';
import { assertRole } from '@/lib/permissions';
import { planSchema } from '@/lib/validation';
import { createSystemComment } from '@/lib/actions/plan-comments';
import { STAGE_LABELS, PLAN_STATUS_LABELS } from '@/lib/success-plans';

export type ActionState = { error?: string } | undefined;

function parsePlanForm(formData: FormData) {
  return planSchema.safeParse({
    donorId: formData.get('donorId'),
    title: formData.get('title'),
    stage: formData.get('stage'),
    planType: formData.get('planType'),
    status: formData.get('status'),
    objective: formData.get('objective'),
    strategyNotes: formData.get('strategyNotes'),
    targetAskAmount: formData.get('targetAskAmount'),
    targetGiftDate: formData.get('targetGiftDate'),
    reviewCadence: formData.get('reviewCadence'),
    targetCompletionDate: formData.get('targetCompletionDate'),
    ownerId: formData.get('ownerId'),
  });
}

export async function savePlanAction(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const session = await auth();
  if (!session) redirect('/login');
  assertRole(session.user.role as Role, Role.FUNDRAISER);

  const parsed = parsePlanForm(formData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Check the plan details.' };
  }

  const { targetGiftDate, targetCompletionDate, donorId, ...rest } = parsed.data;
  const data = {
    ...rest,
    donorId,
    targetGiftDate: targetGiftDate ? new Date(targetGiftDate) : null,
    targetCompletionDate: targetCompletionDate ? new Date(targetCompletionDate) : null,
  };

  const db = forOrg(session.user.organizationId);
  const planId = formData.get('id');

  const isUpdate = typeof planId === 'string' && planId.length > 0;
  const existingPlan = isUpdate
    ? await db.donorSuccessPlan.findUnique({ where: { id: planId as string }, select: { stage: true, status: true } })
    : null;

  const plan = isUpdate
    ? await db.donorSuccessPlan.update({ where: { id: planId as string }, data })
    : await db.donorSuccessPlan.create({
        // organizationId required by create's generated type; forOrg()
        // injects the real value at runtime regardless — see the
        // comment in lib/actions/campaigns.ts.
        data: {
          ...data,
          createdById: session.user.id,
          organizationId: session.user.organizationId,
        },
      });

  // Only meaningful for an update against a plan that already existed —
  // logged after the write succeeds, not before, so a comment never
  // appears for a change that didn't actually happen.
  if (existingPlan) {
    if (existingPlan.stage !== plan.stage) {
      await createSystemComment(
        db,
        session.user.organizationId,
        plan.id,
        `Stage changed to ${STAGE_LABELS[plan.stage as keyof typeof STAGE_LABELS]}.`,
      );
    }
    if (existingPlan.status !== plan.status) {
      await createSystemComment(
        db,
        session.user.organizationId,
        plan.id,
        `Status changed to ${PLAN_STATUS_LABELS[plan.status as keyof typeof PLAN_STATUS_LABELS]}.`,
      );
    }
  }

  revalidatePath(`/donors/${donorId}`);
  revalidatePath(`/donors/${donorId}/plan/${plan.id}`);
  revalidatePath('/plans');
  redirect(`/donors/${donorId}/plan/${plan.id}`);
}

export async function deletePlanAction(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const session = await auth();
  if (!session) redirect('/login');
  assertRole(session.user.role as Role, Role.ADMIN);

  const planId = formData.get('id');
  if (typeof planId !== 'string' || !planId) {
    return { error: 'Missing plan id.' };
  }

  const db = forOrg(session.user.organizationId);
  const plan = await db.donorSuccessPlan.delete({ where: { id: planId } });

  revalidatePath(`/donors/${plan.donorId}`);
  revalidatePath('/plans');
  redirect(`/donors/${plan.donorId}`);
}

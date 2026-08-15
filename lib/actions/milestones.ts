'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { Role, MilestoneStatus } from '@prisma/client';
import { auth } from '@/auth';
import { forOrg } from '@/lib/tenant-db';
import { assertRole } from '@/lib/permissions';
import { milestoneSchema } from '@/lib/validation';
import { createSystemComment } from '@/lib/actions/plan-comments';

export type ActionState = { error?: string } | undefined;

export async function addMilestoneAction(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const session = await auth();
  if (!session) redirect('/login');
  assertRole(session.user.role as Role, Role.FUNDRAISER);

  const planId = formData.get('planId');
  const donorId = formData.get('donorId');
  if (typeof planId !== 'string' || !planId) {
    return { error: 'Missing plan.' };
  }

  const parsed = milestoneSchema.safeParse({
    title: formData.get('title'),
    dueDate: formData.get('dueDate'),
    notes: formData.get('notes'),
    priority: formData.get('priority'),
    category: formData.get('category'),
    ownerId: formData.get('ownerId'),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Check the milestone details.' };
  }

  const db = forOrg(session.user.organizationId);

  // organizationId required by create's generated type; forOrg() injects
  // the real value at runtime regardless — see the comment in
  // lib/actions/campaigns.ts.
  await db.planMilestone.create({
    data: {
      planId,
      title: parsed.data.title,
      dueDate: parsed.data.dueDate ? new Date(parsed.data.dueDate) : null,
      notes: parsed.data.notes,
      priority: parsed.data.priority,
      category: parsed.data.category,
      ownerId: parsed.data.ownerId || null,
      organizationId: session.user.organizationId,
    },
  });

  revalidatePath(`/donors/${donorId}/plan/${planId}`);
  revalidatePath('/plans');
}

/**
 * Edits an existing milestone's details — everything except status,
 * which stays on toggleMilestoneAction below (kept separate since a
 * status change also drives completedAt and the system-comment log,
 * which don't apply to a details-only edit like re-prioritizing or
 * reassigning).
 */
export async function updateMilestoneAction(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const session = await auth();
  if (!session) redirect('/login');
  assertRole(session.user.role as Role, Role.FUNDRAISER);

  const milestoneId = formData.get('id');
  const donorId = formData.get('donorId');
  if (typeof milestoneId !== 'string' || !milestoneId) {
    return { error: 'Missing milestone.' };
  }

  const parsed = milestoneSchema.safeParse({
    title: formData.get('title'),
    dueDate: formData.get('dueDate'),
    notes: formData.get('notes'),
    priority: formData.get('priority'),
    category: formData.get('category'),
    ownerId: formData.get('ownerId'),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Check the milestone details.' };
  }

  const db = forOrg(session.user.organizationId);
  const milestone = await db.planMilestone.update({
    where: { id: milestoneId },
    data: {
      title: parsed.data.title,
      dueDate: parsed.data.dueDate ? new Date(parsed.data.dueDate) : null,
      notes: parsed.data.notes,
      priority: parsed.data.priority,
      category: parsed.data.category,
      ownerId: parsed.data.ownerId || null,
    },
  });

  revalidatePath(`/donors/${donorId}/plan/${milestone.planId}`);
  revalidatePath('/plans');
}

export async function toggleMilestoneAction(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const session = await auth();
  if (!session) redirect('/login');
  assertRole(session.user.role as Role, Role.FUNDRAISER);

  const milestoneId = formData.get('id');
  const donorId = formData.get('donorId');
  const nextStatus = formData.get('status');

  if (typeof milestoneId !== 'string' || !milestoneId) {
    return { error: 'Missing milestone.' };
  }
  if (typeof nextStatus !== 'string' || !(nextStatus in MilestoneStatus)) {
    return { error: 'Invalid status.' };
  }

  const typedStatus = nextStatus as MilestoneStatus;
  const db = forOrg(session.user.organizationId);

  const milestone = await db.planMilestone.update({
    where: { id: milestoneId },
    data: {
      status: typedStatus,
      completedAt: typedStatus === MilestoneStatus.DONE ? new Date() : null,
    },
  });

  if (typedStatus === MilestoneStatus.DONE) {
    await createSystemComment(
      db,
      session.user.organizationId,
      milestone.planId,
      `Milestone marked done: ${milestone.title}.`,
    );
  }

  revalidatePath(`/donors/${donorId}/plan/${milestone.planId}`);
  revalidatePath('/plans');
}

export async function deleteMilestoneAction(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const session = await auth();
  if (!session) redirect('/login');
  assertRole(session.user.role as Role, Role.FUNDRAISER);

  const milestoneId = formData.get('id');
  const donorId = formData.get('donorId');
  if (typeof milestoneId !== 'string' || !milestoneId) {
    return { error: 'Missing milestone id.' };
  }

  const db = forOrg(session.user.organizationId);
  const milestone = await db.planMilestone.delete({ where: { id: milestoneId } });

  revalidatePath(`/donors/${donorId}/plan/${milestone.planId}`);
  revalidatePath('/plans');
}

'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { Role, TaskStatus } from '@prisma/client';
import { auth } from '@/auth';
import { forOrg } from '@/lib/tenant-db';
import { assertRole } from '@/lib/permissions';
import { taskSchema } from '@/lib/validation';

export type ActionState = { error?: string } | undefined;

function parseTaskForm(formData: FormData) {
  return taskSchema.safeParse({
    title: formData.get('title'),
    description: formData.get('description'),
    dueDate: formData.get('dueDate'),
    priority: formData.get('priority'),
    status: formData.get('status'),
    assignedToId: formData.get('assignedToId'),
    donorId: formData.get('donorId'),
    opportunityId: formData.get('opportunityId'),
    grantOpportunityId: formData.get('grantOpportunityId'),
  });
}

/**
 * Unlike saveDonorAction / saveOpportunityAction, this does NOT redirect
 * on success. Tasks are most often added inline from a donor or
 * opportunity page (jotting down a follow-up mid-review), and redirecting
 * away would interrupt that. The standalone /tasks/new and
 * /tasks/[id]/edit pages navigate back to the list themselves, client-side,
 * once they see a successful (error-free) result.
 */
export async function saveTaskAction(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const session = await auth();
  if (!session) redirect('/login');
  assertRole(session.user.role as Role, Role.FUNDRAISER);

  const parsed = parseTaskForm(formData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Check the task details.' };
  }

  const { dueDate, status, donorId, opportunityId, grantOpportunityId, ...rest } = parsed.data;

  const data = {
    ...rest,
    status,
    dueDate: dueDate ? new Date(dueDate) : null,
    donorId: donorId || null,
    opportunityId: opportunityId || null,
    grantOpportunityId: grantOpportunityId || null,
    completedAt: status === TaskStatus.DONE ? new Date() : null,
  };

  const db = forOrg(session.user.organizationId);
  const taskId = formData.get('id');

  if (typeof taskId === 'string' && taskId.length > 0) {
    await db.task.update({ where: { id: taskId }, data });
  } else {
    // organizationId required by create's generated type; forOrg()
    // injects the real value at runtime regardless — see the comment in
    // lib/actions/campaigns.ts.
    await db.task.create({
      data: { ...data, createdById: session.user.id, organizationId: session.user.organizationId },
    });
  }

  revalidatePath('/tasks');
  if (donorId) revalidatePath(`/donors/${donorId}`);
  if (opportunityId) revalidatePath(`/pipeline/${opportunityId}`);
  if (grantOpportunityId) revalidatePath(`/grants/${grantOpportunityId}`);
}

/** Quick complete/reopen toggle from the task list checkbox. */
export async function toggleTaskStatusAction(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const session = await auth();
  if (!session) redirect('/login');
  assertRole(session.user.role as Role, Role.FUNDRAISER);

  const taskId = formData.get('id');
  const nextStatus = formData.get('status');

  if (typeof taskId !== 'string' || !taskId) {
    return { error: 'Missing task.' };
  }
  if (typeof nextStatus !== 'string' || !(nextStatus in TaskStatus)) {
    return { error: 'Invalid status.' };
  }

  const typedStatus = nextStatus as TaskStatus;
  const db = forOrg(session.user.organizationId);

  const task = await db.task.update({
    where: { id: taskId },
    data: {
      status: typedStatus,
      completedAt: typedStatus === TaskStatus.DONE ? new Date() : null,
    },
  });

  revalidatePath('/tasks');
  if (task.donorId) revalidatePath(`/donors/${task.donorId}`);
  if (task.opportunityId) revalidatePath(`/pipeline/${task.opportunityId}`);
}

export async function deleteTaskAction(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const session = await auth();
  if (!session) redirect('/login');
  // Tasks are lower-stakes and personal (someone's own to-do list), so
  // Fundraisers can delete their own — unlike donor/opportunity deletion,
  // which stays Admin+.
  assertRole(session.user.role as Role, Role.FUNDRAISER);

  const taskId = formData.get('id');
  if (typeof taskId !== 'string' || !taskId) {
    return { error: 'Missing task id.' };
  }

  const db = forOrg(session.user.organizationId);
  const task = await db.task.delete({ where: { id: taskId } });

  revalidatePath('/tasks');
  if (task.donorId) revalidatePath(`/donors/${task.donorId}`);
  if (task.opportunityId) revalidatePath(`/pipeline/${task.opportunityId}`);
}

'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { Role } from '@prisma/client';
import { auth } from '@/auth';
import { forOrg } from '@/lib/tenant-db';
import type { ScopedPrisma } from '@/lib/tenant-db';
import { assertRole } from '@/lib/permissions';

export type ActionState = { error?: string; success?: string } | undefined;

export async function createSystemComment(
  db: ScopedPrisma,
  organizationId: string,
  planId: string,
  content: string,
): Promise<void> {
  await db.planComment.create({
    data: {
      organizationId,
      planId,
      content,
      isSystemGenerated: true,
      authorId: null,
    },
  });
}

export async function addPlanCommentAction(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const session = await auth();
  if (!session) redirect('/login');
  assertRole(session.user.role as Role, Role.FUNDRAISER);

  const planId = formData.get('planId');
  const donorId = formData.get('donorId');
  const content = formData.get('content');
  if (typeof planId !== 'string' || !planId) return { error: 'Missing plan.' };
  if (typeof content !== 'string' || !content.trim()) {
    return { error: 'Write something before posting.' };
  }

  const db = forOrg(session.user.organizationId);
  const plan = await db.donorSuccessPlan.findUnique({ where: { id: planId } });
  if (!plan) return { error: 'Plan not found.' };

  await db.planComment.create({
    data: {
      organizationId: session.user.organizationId,
      planId,
      content: content.trim(),
      authorId: session.user.id,
    },
  });

  if (typeof donorId === 'string') revalidatePath(`/donors/${donorId}/plan/${planId}`);
  return { success: 'Posted.' };
}

export async function deletePlanCommentAction(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const session = await auth();
  if (!session) redirect('/login');
  assertRole(session.user.role as Role, Role.FUNDRAISER);

  const id = formData.get('id');
  const donorId = formData.get('donorId');
  const planId = formData.get('planId');
  if (typeof id !== 'string' || !id) return { error: 'Missing comment.' };

  const db = forOrg(session.user.organizationId);
  const comment = await db.planComment.findUnique({ where: { id } });
  if (!comment) return { error: 'Comment not found.' };

  const isAdmin = (session.user.role as Role) === Role.ADMIN || (session.user.role as Role) === Role.OWNER;
  if (comment.isSystemGenerated) {
    return { error: 'System entries can\u2019t be removed.' };
  }
  if (comment.authorId !== session.user.id && !isAdmin) {
    return { error: 'You can only remove your own notes.' };
  }

  await db.planComment.delete({ where: { id } });

  if (typeof donorId === 'string' && typeof planId === 'string') {
    revalidatePath(`/donors/${donorId}/plan/${planId}`);
  }
  return { success: 'Removed.' };
}

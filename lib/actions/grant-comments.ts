'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { Role, GrantRole } from '@prisma/client';
import { auth } from '@/auth';
import { forOrg } from '@/lib/tenant-db';
import type { ScopedPrisma } from '@/lib/tenant-db';
import { assertGrantCapability } from '@/lib/grant-permissions';

export type ActionState = { error?: string; success?: string } | undefined;

/**
 * Shared by any action that should leave a trace in the grant's
 * activity feed — stage changes, milestone completions, disbursements.
 * Deliberately not exported as a public action itself; only called
 * internally by other actions right after their own real work
 * succeeds, so a comment never appears for something that didn't
 * actually happen.
 */
export async function createSystemComment(
  db: ScopedPrisma,
  organizationId: string,
  grantOpportunityId: string,
  content: string,
): Promise<void> {
  await db.grantComment.create({
    data: {
      organizationId,
      grantOpportunityId,
      content,
      isSystemGenerated: true,
      authorId: null,
    },
  });
}

export async function addGrantCommentAction(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const session = await auth();
  if (!session) redirect('/login');
  assertGrantCapability(session.user.role as Role, session.user.grantRole as GrantRole | null, 'COMMENT');

  const grantOpportunityId = formData.get('grantOpportunityId');
  const content = formData.get('content');
  if (typeof grantOpportunityId !== 'string' || !grantOpportunityId) {
    return { error: 'Missing grant.' };
  }
  if (typeof content !== 'string' || !content.trim()) {
    return { error: 'Write something before posting.' };
  }

  const db = forOrg(session.user.organizationId);
  const opportunity = await db.grantOpportunity.findUnique({ where: { id: grantOpportunityId } });
  if (!opportunity) return { error: 'Grant not found.' };

  await db.grantComment.create({
    data: {
      organizationId: session.user.organizationId,
      grantOpportunityId,
      content: content.trim(),
      authorId: session.user.id,
    },
  });

  revalidatePath(`/grants/${grantOpportunityId}`);
  return { success: 'Posted.' };
}

export async function deleteGrantCommentAction(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const session = await auth();
  if (!session) redirect('/login');
  assertGrantCapability(session.user.role as Role, session.user.grantRole as GrantRole | null, 'COMMENT');

  const id = formData.get('id');
  const grantOpportunityId = formData.get('grantOpportunityId');
  if (typeof id !== 'string' || !id) return { error: 'Missing comment.' };

  const db = forOrg(session.user.organizationId);
  const comment = await db.grantComment.findUnique({ where: { id } });
  if (!comment) return { error: 'Comment not found.' };

  // Only your own comments — no editing/deleting someone else's note,
  // and system-generated entries aren't deletable at all (no author to
  // check against, and they're meant to be a permanent activity record).
  const isAdmin = (session.user.role as Role) === Role.ADMIN || (session.user.role as Role) === Role.OWNER;
  if (comment.isSystemGenerated) {
    return { error: 'System entries can\u2019t be removed.' };
  }
  if (comment.authorId !== session.user.id && !isAdmin) {
    return { error: 'You can only remove your own notes.' };
  }

  await db.grantComment.delete({ where: { id } });

  if (typeof grantOpportunityId === 'string') revalidatePath(`/grants/${grantOpportunityId}`);
  return { success: 'Removed.' };
}

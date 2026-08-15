'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { Role } from '@prisma/client';
import { auth } from '@/auth';
import { forOrg } from '@/lib/tenant-db';
import { assertRole } from '@/lib/permissions';
import { recalculateDonorHealthScore } from '@/lib/scoring/recalculate';
import { recalculateOrgDonorScores } from '@/lib/scoring/bulk';

export type ActionState = { error?: string; success?: string } | undefined;

export async function recalculateDonorScoreAction(
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

  const db = forOrg(session.user.organizationId);
  await recalculateDonorHealthScore(db, donorId);

  revalidatePath(`/donors/${donorId}`);
  revalidatePath('/donors');
}

/**
 * Manual "Recalculate all" trigger on Settings — same underlying logic
 * as the nightly cron (lib/scoring/bulk.ts), scoped to just the acting
 * admin's own organization. Useful right after this feature ships, or
 * any time someone doesn't want to wait for the next scheduled run.
 */
export async function recalculateAllScoresAction(
  _prevState: ActionState,
  _formData: FormData,
): Promise<ActionState> {
  const session = await auth();
  if (!session) redirect('/login');
  assertRole(session.user.role as Role, Role.ADMIN);

  const count = await recalculateOrgDonorScores(session.user.organizationId);

  revalidatePath('/donors');
  revalidatePath('/dashboard');
  return { success: `Recalculated ${count} donor${count === 1 ? '' : 's'}.` };
}

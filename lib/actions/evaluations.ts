'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { Role, GrantRole } from '@prisma/client';
import { auth } from '@/auth';
import { forOrg } from '@/lib/tenant-db';
import { assertGrantCapability } from '@/lib/grant-permissions';
import { evaluationSchema } from '@/lib/validation';

export type ActionState = { error?: string; success?: string } | undefined;

/**
 * A reviewer can only ever submit their own evaluation — there's no
 * "score on behalf of" path, unlike the create/edit actions elsewhere
 * in grants management. reviewerId always comes from the session, never
 * from the form, so this doesn't need a separate ownership check the
 * way updateOwnPasswordAction doesn't either.
 */
export async function saveEvaluationAction(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const session = await auth();
  if (!session) redirect('/login');
  assertGrantCapability(session.user.role as Role, session.user.grantRole as GrantRole | null, 'SCORE_APPLICATIONS');

  const applicationId = formData.get('applicationId');
  if (typeof applicationId !== 'string' || !applicationId) {
    return { error: 'Missing application.' };
  }

  const parsed = evaluationSchema.safeParse({
    applicationId,
    scores: formData.getAll('scores'),
    comment: formData.get('comment'),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Check the form for errors.' };
  }

  const db = forOrg(session.user.organizationId);

  const application = await db.granteeApplication.findUnique({ where: { id: applicationId } });
  if (!application) return { error: 'Application not found.' };

  const round = await db.fundingRound.findUnique({ where: { id: application.fundingRoundId } });
  const criteriaCount = Array.isArray(round?.rubricCriteria) ? round.rubricCriteria.length : 0;
  if (parsed.data.scores.length !== criteriaCount) {
    return { error: 'Score every criterion in the rubric.' };
  }

  await db.evaluation.upsert({
    where: { applicationId_reviewerId: { applicationId, reviewerId: session.user.id } },
    create: {
      organizationId: session.user.organizationId,
      applicationId,
      reviewerId: session.user.id,
      scores: parsed.data.scores,
      comment: parsed.data.comment ?? null,
      submittedAt: new Date(),
    },
    update: {
      scores: parsed.data.scores,
      comment: parsed.data.comment ?? null,
      submittedAt: new Date(),
    },
  });

  revalidatePath(`/grantee-applications/${applicationId}`);
  return { success: 'Evaluation submitted.' };
}

'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { Role, OpportunityStage } from '@prisma/client';
import { auth } from '@/auth';
import { forOrg } from '@/lib/tenant-db';
import { assertRole } from '@/lib/permissions';
import { opportunitySchema } from '@/lib/validation';

export type ActionState = { error?: string } | undefined;

const CLOSED_STAGES = new Set<OpportunityStage>([
  OpportunityStage.CLOSED_WON,
  OpportunityStage.CLOSED_LOST,
]);

function parseOpportunityForm(formData: FormData) {
  return opportunitySchema.safeParse({
    donorId: formData.get('donorId'),
    name: formData.get('name'),
    stage: formData.get('stage'),
    askAmount: formData.get('askAmount'),
    expectedAmount: formData.get('expectedAmount'),
    probability: formData.get('probability'),
    expectedCloseDate: formData.get('expectedCloseDate'),
    ownerId: formData.get('ownerId'),
    notes: formData.get('notes'),
  });
}

/**
 * Handles create and edit, same pattern as saveDonorAction: a hidden
 * `id` field on the form routes this to an update instead of a create.
 */
export async function saveOpportunityAction(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const session = await auth();
  if (!session) redirect('/login');
  assertRole(session.user.role as Role, Role.FUNDRAISER);

  const parsed = parseOpportunityForm(formData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Check the opportunity details.' };
  }

  const { expectedCloseDate, stage, ...rest } = parsed.data;

  const data = {
    ...rest,
    stage,
    expectedCloseDate: expectedCloseDate ? new Date(expectedCloseDate) : null,
    closedAt: CLOSED_STAGES.has(stage) ? new Date() : null,
    // Required by create's generated type; harmless no-op on update — see
    // the comment in lib/actions/campaigns.ts for the full explanation.
    organizationId: session.user.organizationId,
  };

  const db = forOrg(session.user.organizationId);
  const oppId = formData.get('id');

  const opportunity =
    typeof oppId === 'string' && oppId.length > 0
      ? await db.opportunity.update({ where: { id: oppId }, data })
      : await db.opportunity.create({ data });

  revalidatePath('/pipeline');
  revalidatePath(`/donors/${opportunity.donorId}`);
  revalidatePath(`/pipeline/${opportunity.id}`);
  redirect(`/pipeline/${opportunity.id}`);
}

/** Quick stage move from the pipeline board's per-card dropdown. */
export async function updateOpportunityStageAction(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const session = await auth();
  if (!session) redirect('/login');
  assertRole(session.user.role as Role, Role.FUNDRAISER);

  const oppId = formData.get('id');
  const stage = formData.get('stage');

  if (typeof oppId !== 'string' || !oppId) {
    return { error: 'Missing opportunity.' };
  }
  if (typeof stage !== 'string' || !(stage in OpportunityStage)) {
    return { error: 'Invalid stage.' };
  }

  const typedStage = stage as OpportunityStage;
  const db = forOrg(session.user.organizationId);

  const opportunity = await db.opportunity.update({
    where: { id: oppId },
    data: {
      stage: typedStage,
      closedAt: CLOSED_STAGES.has(typedStage) ? new Date() : null,
    },
  });

  revalidatePath('/pipeline');
  revalidatePath(`/donors/${opportunity.donorId}`);
}

export async function deleteOpportunityAction(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const session = await auth();
  if (!session) redirect('/login');
  assertRole(session.user.role as Role, Role.ADMIN);

  const oppId = formData.get('id');
  if (typeof oppId !== 'string' || !oppId) {
    return { error: 'Missing opportunity id.' };
  }

  const db = forOrg(session.user.organizationId);
  const opportunity = await db.opportunity.delete({ where: { id: oppId } });

  revalidatePath('/pipeline');
  revalidatePath(`/donors/${opportunity.donorId}`);
  redirect('/pipeline');
}

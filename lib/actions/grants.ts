'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { Role, GrantStage, GrantRole } from '@prisma/client';
import { auth } from '@/auth';
import { forOrg } from '@/lib/tenant-db';
import { assertGrantCapability } from '@/lib/grant-permissions';
import { isOrgType } from '@/lib/donor-types';
import { recalculateDonorHealthScore, recalculateDonorGivingFields } from '@/lib/scoring/recalculate';
import { createSystemComment } from '@/lib/actions/grant-comments';
import { GRANT_STAGE_LABELS } from '@/lib/grants';

export type ActionState = { error?: string; success?: string } | undefined;

const grantSchema = z.object({
  donorId: z.string().min(1, 'Select a funder'),
  name: z.string().trim().min(1, 'Give this grant opportunity a name'),
  programName: z.string().trim().optional().nullable().transform((v) => (v ? v : undefined)),
  askAmount: z.coerce.number().positive('Enter an ask amount'),
  applicationDeadline: z.string().optional().nullable().transform((v) => (v ? v : undefined)),
  decisionExpectedDate: z.string().optional().nullable().transform((v) => (v ? v : undefined)),
  notes: z.string().trim().optional().nullable().transform((v) => (v ? v : undefined)),
  grantWriterId: z.string().min(1, 'Assign a grant writer'),
});

export async function saveGrantOpportunityAction(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const session = await auth();
  if (!session) redirect('/login');
  assertGrantCapability(session.user.role as Role, session.user.grantRole as GrantRole | null, 'MANAGE_OPPORTUNITIES');

  const parsed = grantSchema.safeParse({
    donorId: formData.get('donorId'),
    name: formData.get('name'),
    programName: formData.get('programName'),
    askAmount: formData.get('askAmount'),
    applicationDeadline: formData.get('applicationDeadline'),
    decisionExpectedDate: formData.get('decisionExpectedDate'),
    notes: formData.get('notes'),
    grantWriterId: formData.get('grantWriterId'),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Check the form for errors.' };
  }

  const db = forOrg(session.user.organizationId);

  const donor = await db.donor.findUnique({ where: { id: parsed.data.donorId } });
  if (!donor) return { error: 'Funder not found.' };
  if (!isOrgType(donor.donorType)) {
    return { error: 'The funder must be an Organization, Foundation, or Corporation donor.' };
  }

  const { applicationDeadline, decisionExpectedDate, ...rest } = parsed.data;
  const data = {
    ...rest,
    applicationDeadline: applicationDeadline ? new Date(applicationDeadline) : null,
    decisionExpectedDate: decisionExpectedDate ? new Date(decisionExpectedDate) : null,
  };

  const id = formData.get('id');
  const isUpdate = typeof id === 'string' && id.length > 0;

  const grant = isUpdate
    ? await db.grantOpportunity.update({ where: { id }, data })
    : await db.grantOpportunity.create({
        data: { ...data, organizationId: session.user.organizationId },
      });

  revalidatePath('/grants');
  revalidatePath(`/grants/${grant.id}`);
  redirect(`/grants/${grant.id}`);
}

const stageSchema = z.object({
  stage: z.nativeEnum(GrantStage),
  declineReason: z.string().trim().optional().nullable().transform((v) => (v ? v : undefined)),
});

export async function updateGrantStageAction(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const session = await auth();
  if (!session) redirect('/login');
  assertGrantCapability(session.user.role as Role, session.user.grantRole as GrantRole | null, 'MANAGE_OPPORTUNITIES');

  const id = formData.get('id');
  if (typeof id !== 'string' || !id) return { error: 'Missing grant.' };

  const parsed = stageSchema.safeParse({
    stage: formData.get('stage'),
    declineReason: formData.get('declineReason'),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Check the form for errors.' };
  }

  const db = forOrg(session.user.organizationId);
  const isTerminal = parsed.data.stage === GrantStage.AWARDED || parsed.data.stage === GrantStage.DECLINED;

  await db.grantOpportunity.update({
    where: { id },
    data: {
      stage: parsed.data.stage,
      declineReason: parsed.data.stage === GrantStage.DECLINED ? parsed.data.declineReason : null,
      decidedAt: isTerminal ? new Date() : null,
    },
  });

  await createSystemComment(
    db,
    session.user.organizationId,
    id,
    `Stage changed to ${GRANT_STAGE_LABELS[parsed.data.stage]}.`,
  );

  revalidatePath('/grants');
  revalidatePath(`/grants/${id}`);
  return { success: 'Stage updated.' };
}

export async function deleteGrantOpportunityAction(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const session = await auth();
  if (!session) redirect('/login');
  assertGrantCapability(session.user.role as Role, session.user.grantRole as GrantRole | null, 'DELETE_GRANTS');

  const id = formData.get('id');
  if (typeof id !== 'string' || !id) return { error: 'Missing grant.' };

  const db = forOrg(session.user.organizationId);
  await db.grantRequirement.deleteMany({ where: { grantOpportunityId: id } });
  await db.grantOpportunity.delete({ where: { id } });

  revalidatePath('/grants');
  return { success: 'Grant opportunity deleted.' };
}

// ── Requirements checklist ──────────────────────────────────────────────

const requirementSchema = z.object({
  name: z.string().trim().min(1, 'Give this requirement a name'),
  dueDate: z.string().optional().nullable().transform((v) => (v ? v : undefined)),
});

export async function addGrantRequirementAction(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const session = await auth();
  if (!session) redirect('/login');
  assertGrantCapability(session.user.role as Role, session.user.grantRole as GrantRole | null, 'MANAGE_OPPORTUNITIES');

  const grantOpportunityId = formData.get('grantOpportunityId');
  if (typeof grantOpportunityId !== 'string' || !grantOpportunityId) {
    return { error: 'Missing grant.' };
  }

  const parsed = requirementSchema.safeParse({
    name: formData.get('name'),
    dueDate: formData.get('dueDate'),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Check the form for errors.' };
  }

  const db = forOrg(session.user.organizationId);
  const count = await db.grantRequirement.count({ where: { grantOpportunityId } });

  await db.grantRequirement.create({
    data: {
      organizationId: session.user.organizationId,
      grantOpportunityId,
      name: parsed.data.name,
      dueDate: parsed.data.dueDate ? new Date(parsed.data.dueDate) : null,
      sortOrder: count,
    },
  });

  revalidatePath(`/grants/${grantOpportunityId}`);
  return { success: 'Requirement added.' };
}

export async function toggleGrantRequirementAction(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const session = await auth();
  if (!session) redirect('/login');
  assertGrantCapability(session.user.role as Role, session.user.grantRole as GrantRole | null, 'MANAGE_OPPORTUNITIES');

  const id = formData.get('id');
  const grantOpportunityId = formData.get('grantOpportunityId');
  if (typeof id !== 'string' || !id || typeof grantOpportunityId !== 'string' || !grantOpportunityId) {
    return { error: 'Missing requirement.' };
  }

  const db = forOrg(session.user.organizationId);
  const requirement = await db.grantRequirement.findUnique({ where: { id } });
  if (!requirement) return { error: 'Requirement not found.' };

  await db.grantRequirement.update({
    where: { id },
    data: { isComplete: !requirement.isComplete },
  });

  revalidatePath(`/grants/${grantOpportunityId}`);
  return { success: 'Updated.' };
}

export async function deleteGrantRequirementAction(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const session = await auth();
  if (!session) redirect('/login');
  assertGrantCapability(session.user.role as Role, session.user.grantRole as GrantRole | null, 'MANAGE_OPPORTUNITIES');

  const id = formData.get('id');
  const grantOpportunityId = formData.get('grantOpportunityId');
  if (typeof id !== 'string' || !id || typeof grantOpportunityId !== 'string' || !grantOpportunityId) {
    return { error: 'Missing requirement.' };
  }

  const db = forOrg(session.user.organizationId);
  await db.grantRequirement.delete({ where: { id } });

  revalidatePath(`/grants/${grantOpportunityId}`);
  return { success: 'Requirement removed.' };
}

// ── Phase 2: award conversion, compliance plan, disbursements ──────────

const convertSchema = z.object({
  awardAmount: z.coerce.number().positive('Enter an award amount'),
  periodStart: z.string().min(1, 'Grant period start date is required'),
  periodEnd: z.string().optional().nullable().transform((v) => (v ? v : undefined)),
  restrictedUseNotes: z.string().trim().optional().nullable().transform((v) => (v ? v : undefined)),
  complianceOwnerId: z.string().min(1, 'Assign a compliance owner'),
});

/**
 * Converts an Awarded GrantOpportunity into a tracked Grant. This is
 * the moment the grant writer's job ends and the compliance owner's
 * begins — a real handoff, not just a status change, which is why it's
 * a distinct action with its own form rather than something that
 * happens automatically the instant the stage flips to Awarded.
 */
export async function convertGrantToAwardAction(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const session = await auth();
  if (!session) redirect('/login');
  assertGrantCapability(session.user.role as Role, session.user.grantRole as GrantRole | null, 'MANAGE_OPPORTUNITIES');

  const grantOpportunityId = formData.get('grantOpportunityId');
  if (typeof grantOpportunityId !== 'string' || !grantOpportunityId) {
    return { error: 'Missing grant opportunity.' };
  }

  const parsed = convertSchema.safeParse({
    awardAmount: formData.get('awardAmount'),
    periodStart: formData.get('periodStart'),
    periodEnd: formData.get('periodEnd'),
    restrictedUseNotes: formData.get('restrictedUseNotes'),
    complianceOwnerId: formData.get('complianceOwnerId'),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Check the form for errors.' };
  }

  const db = forOrg(session.user.organizationId);

  const opportunity = await db.grantOpportunity.findUnique({ where: { id: grantOpportunityId } });
  if (!opportunity) return { error: 'Grant opportunity not found.' };
  if (opportunity.stage !== GrantStage.AWARDED) {
    return { error: 'Set the stage to Awarded before converting this to a tracked grant.' };
  }

  const existing = await db.grant.findUnique({ where: { grantOpportunityId } });
  if (existing) return { error: 'This grant opportunity has already been converted.' };

  await db.grant.create({
    data: {
      organizationId: session.user.organizationId,
      grantOpportunityId,
      donorId: opportunity.donorId,
      name: opportunity.name,
      awardAmount: parsed.data.awardAmount,
      periodStart: new Date(parsed.data.periodStart),
      periodEnd: parsed.data.periodEnd ? new Date(parsed.data.periodEnd) : null,
      restrictedUseNotes: parsed.data.restrictedUseNotes,
      grantWriterId: opportunity.grantWriterId,
      complianceOwnerId: parsed.data.complianceOwnerId,
    },
  });

  revalidatePath(`/grants/${grantOpportunityId}`);
  return { success: 'Converted to a tracked grant.' };
}

// ── Compliance plan (milestones) ────────────────────────────────────────

const milestoneSchema = z.object({
  name: z.string().trim().min(1, 'Give this milestone a name'),
  dueDate: z.string().min(1, 'Due date is required'),
});

export async function addGrantMilestoneAction(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const session = await auth();
  if (!session) redirect('/login');
  assertGrantCapability(session.user.role as Role, session.user.grantRole as GrantRole | null, 'MANAGE_COMPLIANCE');

  const grantId = formData.get('grantId');
  const grantOpportunityId = formData.get('grantOpportunityId');
  if (typeof grantId !== 'string' || !grantId) return { error: 'Missing grant.' };

  const parsed = milestoneSchema.safeParse({
    name: formData.get('name'),
    dueDate: formData.get('dueDate'),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Check the form for errors.' };
  }

  const db = forOrg(session.user.organizationId);
  const count = await db.grantMilestone.count({ where: { grantId } });

  await db.grantMilestone.create({
    data: {
      organizationId: session.user.organizationId,
      grantId,
      name: parsed.data.name,
      dueDate: new Date(parsed.data.dueDate),
      sortOrder: count,
    },
  });

  if (typeof grantOpportunityId === 'string') revalidatePath(`/grants/${grantOpportunityId}`);
  return { success: 'Milestone added.' };
}

export async function toggleGrantMilestoneAction(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const session = await auth();
  if (!session) redirect('/login');
  assertGrantCapability(session.user.role as Role, session.user.grantRole as GrantRole | null, 'MANAGE_COMPLIANCE');

  const id = formData.get('id');
  const grantOpportunityId = formData.get('grantOpportunityId');
  if (typeof id !== 'string' || !id) return { error: 'Missing milestone.' };

  const db = forOrg(session.user.organizationId);
  const milestone = await db.grantMilestone.findUnique({ where: { id } });
  if (!milestone) return { error: 'Milestone not found.' };

  const isComplete = !milestone.isComplete;
  await db.grantMilestone.update({
    where: { id },
    data: { isComplete, completedAt: isComplete ? new Date() : null },
  });

  if (isComplete && typeof grantOpportunityId === 'string') {
    await createSystemComment(
      db,
      session.user.organizationId,
      grantOpportunityId,
      `Milestone marked complete: ${milestone.name}.`,
    );
  }

  if (typeof grantOpportunityId === 'string') revalidatePath(`/grants/${grantOpportunityId}`);
  return { success: 'Updated.' };
}

export async function deleteGrantMilestoneAction(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const session = await auth();
  if (!session) redirect('/login');
  assertGrantCapability(session.user.role as Role, session.user.grantRole as GrantRole | null, 'MANAGE_COMPLIANCE');

  const id = formData.get('id');
  const grantOpportunityId = formData.get('grantOpportunityId');
  if (typeof id !== 'string' || !id) return { error: 'Missing milestone.' };

  const db = forOrg(session.user.organizationId);
  await db.grantMilestone.delete({ where: { id } });

  if (typeof grantOpportunityId === 'string') revalidatePath(`/grants/${grantOpportunityId}`);
  return { success: 'Milestone removed.' };
}

// ── Disbursements ────────────────────────────────────────────────────────

const disbursementSchema = z.object({
  amount: z.coerce.number().positive('Enter a disbursement amount'),
  date: z.string().min(1, 'Date is required'),
  notes: z.string().trim().optional().nullable().transform((v) => (v ? v : undefined)),
});

/**
 * Records a real Gift linked back to this Grant — same cached-field
 * update pattern as lib/actions/gifts.ts's createGiftAction (lifetime
 * giving, gift count, first/last gift date, largest gift, health score
 * recalculation), since a grant disbursement is a real gift and should
 * roll into the funder's donor record exactly like any other one. A
 * multi-year grant paid in installments produces one of these per
 * disbursement, each traceable back to the same Grant via gift.grantId.
 */
export async function recordGrantDisbursementAction(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const session = await auth();
  if (!session) redirect('/login');
  assertGrantCapability(session.user.role as Role, session.user.grantRole as GrantRole | null, 'MANAGE_FINANCIALS');

  const grantId = formData.get('grantId');
  const grantOpportunityId = formData.get('grantOpportunityId');
  if (typeof grantId !== 'string' || !grantId) return { error: 'Missing grant.' };

  const parsed = disbursementSchema.safeParse({
    amount: formData.get('amount'),
    date: formData.get('date'),
    notes: formData.get('notes'),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Check the form for errors.' };
  }

  const db = forOrg(session.user.organizationId);
  const grant = await db.grant.findUnique({ where: { id: grantId } });
  if (!grant) return { error: 'Grant not found.' };

  const giftDate = new Date(parsed.data.date);

  await db.$transaction(async (tx) => {
    await tx.gift.create({
      data: {
        organizationId: session.user.organizationId,
        donorId: grant.donorId,
        grantId: grant.id,
        amount: parsed.data.amount,
        date: giftDate,
        giftType: 'GRANT',
        notes: parsed.data.notes,
      },
    });

    const donor = await tx.donor.findUniqueOrThrow({ where: { id: grant.donorId } });
    const update: Record<string, unknown> = {
      lifetimeGiving: { increment: parsed.data.amount },
      giftCount: { increment: 1 },
    };
    if (!donor.firstGiftDate || giftDate < donor.firstGiftDate) update.firstGiftDate = giftDate;
    if (!donor.lastGiftDate || giftDate > donor.lastGiftDate) update.lastGiftDate = giftDate;
    if (!donor.largestGift || parsed.data.amount > Number(donor.largestGift)) {
      update.largestGift = parsed.data.amount;
    }
    await tx.donor.update({ where: { id: grant.donorId }, data: update });

    await recalculateDonorHealthScore(tx, grant.donorId);
  });

  if (typeof grantOpportunityId === 'string') {
    await createSystemComment(
      db,
      session.user.organizationId,
      grantOpportunityId,
      `Disbursement recorded: ${parsed.data.amount.toLocaleString('en-US', { style: 'currency', currency: 'USD' })}.`,
    );
  }

  if (typeof grantOpportunityId === 'string') revalidatePath(`/grants/${grantOpportunityId}`);
  revalidatePath(`/donors/${grant.donorId}`);
  revalidatePath('/donors');
  return { success: 'Disbursement recorded.' };
}

const updateDisbursementSchema = z.object({
  amount: z.coerce.number().positive('Enter a disbursement amount'),
  date: z.string().min(1, 'Date is required'),
  notes: z.string().trim().optional().nullable().transform((v) => (v ? v : undefined)),
});

/**
 * Editing or deleting a disbursement both go through
 * recalculateDonorGivingFields afterward — simple subtraction isn't
 * enough here, since the gift being changed might have been the
 * donor's largest, first, or most recent, and finding the correct new
 * value requires looking at what's left regardless.
 */
export async function updateGrantDisbursementAction(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const session = await auth();
  if (!session) redirect('/login');
  assertGrantCapability(session.user.role as Role, session.user.grantRole as GrantRole | null, 'MANAGE_FINANCIALS');

  const giftId = formData.get('giftId');
  const grantOpportunityId = formData.get('grantOpportunityId');
  if (typeof giftId !== 'string' || !giftId) return { error: 'Missing disbursement.' };

  const parsed = updateDisbursementSchema.safeParse({
    amount: formData.get('amount'),
    date: formData.get('date'),
    notes: formData.get('notes'),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Check the form for errors.' };
  }

  const db = forOrg(session.user.organizationId);
  const gift = await db.gift.findUnique({ where: { id: giftId } });
  if (!gift || !gift.grantId) return { error: 'Disbursement not found.' };

  await db.$transaction(async (tx) => {
    await tx.gift.update({
      where: { id: giftId },
      data: { amount: parsed.data.amount, date: new Date(parsed.data.date), notes: parsed.data.notes },
    });
    await recalculateDonorGivingFields(tx, gift.donorId);
    await recalculateDonorHealthScore(tx, gift.donorId);
  });

  if (typeof grantOpportunityId === 'string') revalidatePath(`/grants/${grantOpportunityId}`);
  revalidatePath(`/donors/${gift.donorId}`);
  revalidatePath('/donors');
  return { success: 'Disbursement updated.' };
}

export async function deleteGrantDisbursementAction(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const session = await auth();
  if (!session) redirect('/login');
  assertGrantCapability(session.user.role as Role, session.user.grantRole as GrantRole | null, 'MANAGE_FINANCIALS');

  const giftId = formData.get('giftId');
  const grantOpportunityId = formData.get('grantOpportunityId');
  if (typeof giftId !== 'string' || !giftId) return { error: 'Missing disbursement.' };

  const db = forOrg(session.user.organizationId);
  const gift = await db.gift.findUnique({ where: { id: giftId } });
  if (!gift || !gift.grantId) return { error: 'Disbursement not found.' };

  await db.$transaction(async (tx) => {
    await tx.gift.delete({ where: { id: giftId } });
    await recalculateDonorGivingFields(tx, gift.donorId);
    await recalculateDonorHealthScore(tx, gift.donorId);
  });

  if (typeof grantOpportunityId === 'string') revalidatePath(`/grants/${grantOpportunityId}`);
  revalidatePath(`/donors/${gift.donorId}`);
  revalidatePath('/donors');
  return { success: 'Disbursement removed.' };
}

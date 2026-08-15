'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { Role, GrantRole, GrantStage } from '@prisma/client';
import { auth } from '@/auth';
import { forOrg } from '@/lib/tenant-db';
import { permissions } from '@/lib/permissions';
import { assertGrantCapability } from '@/lib/grant-permissions';
import { isOrgType } from '@/lib/donor-types';

export type ActionState = { error?: string; success?: string } | undefined;

const convertSchema = z.object({
  name: z.string().trim().min(1, 'Give this grant a name'),
  askAmount: z.coerce.number().positive('Enter an ask amount'),
  stage: z.nativeEnum(GrantStage),
  grantWriterId: z.string().min(1, 'Select a grant writer'),
  applicationDeadline: z.string().optional().nullable().transform((v) => (v ? v : undefined)),
  decisionExpectedDate: z.string().optional().nullable().transform((v) => (v ? v : undefined)),
  notes: z.string().trim().optional().nullable().transform((v) => (v ? v : undefined)),
});

export async function convertOpportunityToGrantAction(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const session = await auth();
  if (!session) redirect('/login');

  const role = session.user.role as Role;
  const grantRole = session.user.grantRole as GrantRole | null;
  if (!permissions.canEditDonors(role)) {
    return { error: 'You do not have permission to convert this opportunity.' };
  }
  assertGrantCapability(role, grantRole, 'MANAGE_OPPORTUNITIES');

  const opportunityId = formData.get('opportunityId');
  if (typeof opportunityId !== 'string' || !opportunityId) return { error: 'Missing opportunity.' };

  const parsed = convertSchema.safeParse({
    name: formData.get('name'),
    askAmount: formData.get('askAmount'),
    stage: formData.get('stage'),
    grantWriterId: formData.get('grantWriterId'),
    applicationDeadline: formData.get('applicationDeadline'),
    decisionExpectedDate: formData.get('decisionExpectedDate'),
    notes: formData.get('notes'),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Check the form for errors.' };

  const db = forOrg(session.user.organizationId);

  const opportunity = await db.opportunity.findUnique({
    where: { id: opportunityId },
    include: { donor: { select: { id: true, donorType: true } } },
  });
  if (!opportunity) return { error: 'Opportunity not found.' };

  if (!isOrgType(opportunity.donor.donorType)) {
    return {
      error:
        'This opportunity\u2019s donor is an individual, not an Organization/Foundation/Corporation \u2014 grants can only be attributed to organization-type funders. Update the donor\u2019s type first if this is actually a foundation or company.',
    };
  }

  const grant = await db.grantOpportunity.create({
    data: {
      organizationId: session.user.organizationId,
      donorId: opportunity.donor.id,
      name: parsed.data.name,
      askAmount: parsed.data.askAmount,
      stage: parsed.data.stage,
      grantWriterId: parsed.data.grantWriterId,
      applicationDeadline: parsed.data.applicationDeadline ? new Date(parsed.data.applicationDeadline) : null,
      decisionExpectedDate: parsed.data.decisionExpectedDate ? new Date(parsed.data.decisionExpectedDate) : null,
      decidedAt:
        parsed.data.stage === GrantStage.AWARDED || parsed.data.stage === GrantStage.DECLINED
          ? (opportunity.closedAt ?? new Date())
          : null,
      notes: parsed.data.notes,
    },
  });

  await db.task.updateMany({
    where: { opportunityId: opportunity.id },
    data: { opportunityId: null, grantOpportunityId: grant.id },
  });

  await db.opportunity.delete({ where: { id: opportunity.id } });

  revalidatePath('/pipeline');
  revalidatePath('/grants');
  revalidatePath(`/donors/${opportunity.donor.id}`);
  redirect(`/grants/${grant.id}`);
}

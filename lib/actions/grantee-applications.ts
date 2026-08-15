'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { Role, GrantRole } from '@prisma/client';
import { auth } from '@/auth';
import { forOrg } from '@/lib/tenant-db';
import { assertGrantCapability } from '@/lib/grant-permissions';
import { applicationCategoryRequestSchema } from '@/lib/validation';

export type ActionState = { error?: string; success?: string } | undefined;

/**
 * Starts a new application for a grantee in a round. Compliance
 * certifications are carried forward from the grantee's most recent
 * prior application (if any) rather than defaulting to unchecked — see
 * the reasoning on GranteeApplication.notOnWatchList in schema.prisma.
 * Still editable afterward from the application itself.
 */
export async function createGranteeApplicationAction(
  fundingRoundId: string,
  granteeId: string,
): Promise<ActionState> {
  const session = await auth();
  if (!session) redirect('/login');
  assertGrantCapability(session.user.role as Role, session.user.grantRole as GrantRole | null, 'MANAGE_APPLICATIONS');

  const db = forOrg(session.user.organizationId);

  const [round, grantee, existing] = await Promise.all([
    db.fundingRound.findUnique({ where: { id: fundingRoundId } }),
    db.grantee.findUnique({ where: { id: granteeId } }),
    db.granteeApplication.findUnique({
      where: { fundingRoundId_granteeId: { fundingRoundId, granteeId } },
    }),
  ]);
  if (!round) return { error: 'Funding round not found.' };
  if (!grantee) return { error: 'Grantee not found.' };
  if (existing) return { error: 'This grantee already has an application in this round.' };

  const priorApplication = await db.granteeApplication.findFirst({
    where: { granteeId },
    orderBy: { createdAt: 'desc' },
    select: { notOnWatchList: true, patriotActCompliant: true, notDebarred: true },
  });

  const application = await db.granteeApplication.create({
    data: {
      organizationId: session.user.organizationId,
      fundingRoundId,
      granteeId,
      notOnWatchList: priorApplication?.notOnWatchList ?? false,
      patriotActCompliant: priorApplication?.patriotActCompliant ?? false,
      notDebarred: priorApplication?.notDebarred ?? false,
    },
  });

  revalidatePath(`/funding-rounds/${fundingRoundId}`);
  redirect(`/grantee-applications/${application.id}`);
}

export async function updateComplianceAction(
  applicationId: string,
  formData: FormData,
): Promise<ActionState> {
  const session = await auth();
  if (!session) redirect('/login');
  assertGrantCapability(session.user.role as Role, session.user.grantRole as GrantRole | null, 'MANAGE_APPLICATIONS');

  const db = forOrg(session.user.organizationId);
  const application = await db.granteeApplication.findUnique({ where: { id: applicationId } });
  if (!application) return { error: 'Application not found.' };

  await db.granteeApplication.update({
    where: { id: applicationId },
    data: {
      notOnWatchList: formData.get('notOnWatchList') === 'on',
      patriotActCompliant: formData.get('patriotActCompliant') === 'on',
      notDebarred: formData.get('notDebarred') === 'on',
    },
  });

  revalidatePath(`/grantee-applications/${applicationId}`);
  return { success: 'Compliance certifications updated.' };
}

export async function saveCategoryRequestAction(
  applicationId: string,
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const session = await auth();
  if (!session) redirect('/login');
  assertGrantCapability(session.user.role as Role, session.user.grantRole as GrantRole | null, 'MANAGE_APPLICATIONS');

  const parsed = applicationCategoryRequestSchema.safeParse({
    category: formData.get('category'),
    requestedAmount: formData.get('requestedAmount'),
    targetPopulation: formData.get('targetPopulation'),
    intakeProcess: formData.get('intakeProcess'),
    deliveryMethod: formData.get('deliveryMethod'),
    county: formData.get('county'),
    serviceLocation: formData.get('serviceLocation'),
    unitsProjected: formData.get('unitsProjected'),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Check the form for errors.' };
  }

  const db = forOrg(session.user.organizationId);

  const application = await db.granteeApplication.findUnique({ where: { id: applicationId } });
  if (!application) return { error: 'Application not found.' };

  const round = await db.fundingRound.findUnique({ where: { id: application.fundingRoundId } });
  if (!round) return { error: 'Funding round not found.' };
  if (!round.categories.includes(parsed.data.category)) {
    return { error: 'That category is not open for this round.' };
  }

  const id = formData.get('id');
  const isUpdate = typeof id === 'string' && id.length > 0;

  if (isUpdate) {
    await db.applicationCategoryRequest.update({ where: { id }, data: parsed.data });
  } else {
    await db.applicationCategoryRequest.create({
      data: {
        ...parsed.data,
        organizationId: session.user.organizationId,
        applicationId,
        fundingRoundId: application.fundingRoundId,
      },
    });
  }

  revalidatePath(`/grantee-applications/${applicationId}`);
  return { success: 'Category request saved.' };
}

export async function deleteCategoryRequestAction(categoryRequestId: string): Promise<ActionState> {
  const session = await auth();
  if (!session) redirect('/login');
  assertGrantCapability(session.user.role as Role, session.user.grantRole as GrantRole | null, 'MANAGE_APPLICATIONS');

  const db = forOrg(session.user.organizationId);
  const request = await db.applicationCategoryRequest.findUnique({ where: { id: categoryRequestId } });
  if (!request) return { error: 'Category request not found.' };

  await db.applicationCategoryRequest.delete({ where: { id: categoryRequestId } });

  revalidatePath(`/grantee-applications/${request.applicationId}`);
  return { success: 'Category request removed.' };
}

export async function submitGranteeApplicationAction(applicationId: string): Promise<ActionState> {
  const session = await auth();
  if (!session) redirect('/login');
  assertGrantCapability(session.user.role as Role, session.user.grantRole as GrantRole | null, 'MANAGE_APPLICATIONS');

  const db = forOrg(session.user.organizationId);

  const application = await db.granteeApplication.findUnique({
    where: { id: applicationId },
    include: { categoryRequests: true },
  });
  if (!application) return { error: 'Application not found.' };
  if (application.categoryRequests.length === 0) {
    return { error: 'Add at least one service category request before submitting.' };
  }
  if (!application.notOnWatchList || !application.patriotActCompliant || !application.notDebarred) {
    return { error: 'All compliance certifications must be confirmed before submitting.' };
  }

  await db.granteeApplication.update({
    where: { id: applicationId },
    data: { status: 'SUBMITTED', submittedAt: new Date() },
  });

  revalidatePath(`/grantee-applications/${applicationId}`);
  revalidatePath(`/funding-rounds/${application.fundingRoundId}`);
  return { success: 'Application submitted.' };
}

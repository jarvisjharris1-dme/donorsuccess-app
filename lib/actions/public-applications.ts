'use server';

import { redirect } from 'next/navigation';
import { prisma } from '@/lib/db';
import {
  createCommunitySession,
  findOrCreateCommunityApplicant,
  issueCommunityMagicLink,
  setCommunitySessionCookie,
} from '@/lib/community-portal';

function text(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === 'string' ? value.trim() : '';
}

async function getOpenRound(roundId: string) {
  const round = await prisma.fundingRound.findUnique({
    where: { id: roundId },
    include: { organization: { select: { name: true } } },
  });
  if (!round || round.status !== 'OPEN') redirect(`/apply/${roundId}?error=closed`);
  const now = new Date();
  if (round.opensAt && now < round.opensAt) redirect(`/apply/${roundId}?error=closed`);
  if (round.closesAt && now > round.closesAt) redirect(`/apply/${roundId}?error=closed`);
  return round;
}

async function findOrUpsertGrantee(round: Awaited<ReturnType<typeof getOpenRound>>, formData: FormData) {
  const legalName = text(formData, 'legalName');
  const ein = text(formData, 'ein');
  const contactName = text(formData, 'contactName');
  const contactEmail = text(formData, 'contactEmail').toLowerCase();
  if (!legalName || !contactName || !contactEmail) redirect(`/apply/${round.id}?error=required`);

  const existing = ein
    ? await prisma.grantee.findFirst({ where: { organizationId: round.organizationId, ein } })
    : await prisma.grantee.findFirst({ where: { organizationId: round.organizationId, contactEmail } });

  if (existing) {
    return prisma.grantee.update({
      where: { id: existing.id },
      data: {
        legalName,
        ein: ein || existing.ein,
        contactName,
        contactEmail,
        contactPhone: text(formData, 'contactPhone') || null,
        addressLine1: text(formData, 'addressLine1') || existing.addressLine1,
        city: text(formData, 'city') || existing.city,
        state: text(formData, 'state') || existing.state,
        postalCode: text(formData, 'postalCode') || existing.postalCode,
        missionSummary: text(formData, 'missionSummary') || existing.missionSummary,
      },
    });
  }

  return prisma.grantee.create({
    data: {
      organizationId: round.organizationId,
      legalName,
      ein: ein || null,
      contactName,
      contactEmail,
      contactPhone: text(formData, 'contactPhone') || null,
      addressLine1: text(formData, 'addressLine1') || null,
      city: text(formData, 'city') || null,
      state: text(formData, 'state') || null,
      postalCode: text(formData, 'postalCode') || null,
      missionSummary: text(formData, 'missionSummary') || null,
    },
  });
}

async function establishApplicantAccess(input: {
  organizationId: string;
  organizationName: string;
  granteeId: string;
  contactName: string;
  contactEmail: string;
}) {
  const applicant = await findOrCreateCommunityApplicant({
    organizationId: input.organizationId,
    granteeId: input.granteeId,
    name: input.contactName,
    email: input.contactEmail,
  });
  const session = await createCommunitySession(applicant.id);
  setCommunitySessionCookie(session.token, session.expiresAt);
  try {
    await issueCommunityMagicLink({
      applicantId: applicant.id,
      email: input.contactEmail,
      organizationName: input.organizationName,
    });
  } catch (error) {
    // Saving/submitting must not fail simply because email delivery is temporarily unavailable.
    console.error('[Community Portal] Applicant access email failed', error);
  }
  return applicant;
}

export async function savePublicApplicationDraftAction(roundId: string, formData: FormData) {
  const round = await getOpenRound(roundId);
  const grantee = await findOrUpsertGrantee(round, formData);
  const category = text(formData, 'category');
  const requestedAmount = Number(text(formData, 'requestedAmount'));

  if (category && !round.categories.includes(category)) redirect(`/apply/${roundId}?error=category`);

  let application = await prisma.granteeApplication.findUnique({
    where: { fundingRoundId_granteeId: { fundingRoundId: round.id, granteeId: grantee.id } },
    include: { categoryRequests: true },
  });

  if (application && application.status !== 'DRAFT') redirect(`/apply/${roundId}?error=duplicate`);

  if (!application) {
    application = await prisma.granteeApplication.create({
      data: {
        organizationId: round.organizationId,
        fundingRoundId: round.id,
        granteeId: grantee.id,
        status: 'DRAFT',
        notOnWatchList: formData.get('notOnWatchList') === 'on',
        patriotActCompliant: formData.get('patriotActCompliant') === 'on',
        notDebarred: formData.get('notDebarred') === 'on',
      },
      include: { categoryRequests: true },
    });
  } else {
    application = await prisma.granteeApplication.update({
      where: { id: application.id },
      data: {
        notOnWatchList: formData.get('notOnWatchList') === 'on',
        patriotActCompliant: formData.get('patriotActCompliant') === 'on',
        notDebarred: formData.get('notDebarred') === 'on',
      },
      include: { categoryRequests: true },
    });
  }

  if (category && Number.isFinite(requestedAmount) && requestedAmount > 0) {
    const data = {
      category,
      requestedAmount,
      targetPopulation: text(formData, 'targetPopulation') || null,
      intakeProcess: text(formData, 'intakeProcess') || null,
      deliveryMethod: text(formData, 'deliveryMethod') || null,
      county: text(formData, 'county') || null,
      serviceLocation: text(formData, 'serviceLocation') || null,
      unitsProjected: Number(text(formData, 'unitsProjected')) || null,
    };
    const firstRequest = application.categoryRequests[0];
    if (firstRequest) {
      await prisma.applicationCategoryRequest.update({ where: { id: firstRequest.id }, data });
    } else {
      await prisma.applicationCategoryRequest.create({
        data: {
          ...data,
          organizationId: round.organizationId,
          applicationId: application.id,
          fundingRoundId: round.id,
        },
      });
    }
  }

  await establishApplicantAccess({
    organizationId: round.organizationId,
    organizationName: round.organization.name,
    granteeId: grantee.id,
    contactName: text(formData, 'contactName'),
    contactEmail: text(formData, 'contactEmail').toLowerCase(),
  });

  redirect(`/community/portal/applications/${application.id}?saved=1`);
}

export async function submitPublicApplicationAction(roundId: string, formData: FormData) {
  const round = await getOpenRound(roundId);
  const grantee = await findOrUpsertGrantee(round, formData);
  const contactName = text(formData, 'contactName');
  const contactEmail = text(formData, 'contactEmail').toLowerCase();
  const category = text(formData, 'category');
  const requestedAmount = Number(text(formData, 'requestedAmount'));

  if (!category || !Number.isFinite(requestedAmount) || requestedAmount <= 0) redirect(`/apply/${roundId}?error=required`);
  if (!round.categories.includes(category)) redirect(`/apply/${roundId}?error=category`);

  const certified = ['notOnWatchList', 'patriotActCompliant', 'notDebarred'].every(
    (key) => formData.get(key) === 'on',
  );
  if (!certified) redirect(`/apply/${roundId}?error=certifications`);

  const existingApplication = await prisma.granteeApplication.findUnique({
    where: { fundingRoundId_granteeId: { fundingRoundId: round.id, granteeId: grantee.id } },
    include: { categoryRequests: true },
  });
  if (existingApplication && existingApplication.status !== 'DRAFT') redirect(`/apply/${roundId}?error=duplicate`);

  const application = await prisma.$transaction(async (tx) => {
    const app = existingApplication
      ? await tx.granteeApplication.update({
          where: { id: existingApplication.id },
          data: {
            notOnWatchList: true,
            patriotActCompliant: true,
            notDebarred: true,
            status: 'SUBMITTED',
            submittedAt: new Date(),
          },
        })
      : await tx.granteeApplication.create({
          data: {
            organizationId: round.organizationId,
            fundingRoundId: round.id,
            granteeId: grantee.id,
            notOnWatchList: true,
            patriotActCompliant: true,
            notDebarred: true,
            status: 'SUBMITTED',
            submittedAt: new Date(),
          },
        });

    const data = {
      category,
      requestedAmount,
      targetPopulation: text(formData, 'targetPopulation') || null,
      intakeProcess: text(formData, 'intakeProcess') || null,
      deliveryMethod: text(formData, 'deliveryMethod') || null,
      county: text(formData, 'county') || null,
      serviceLocation: text(formData, 'serviceLocation') || null,
      unitsProjected: Number(text(formData, 'unitsProjected')) || null,
    };
    const firstRequest = existingApplication?.categoryRequests[0];
    if (firstRequest) await tx.applicationCategoryRequest.update({ where: { id: firstRequest.id }, data });
    else await tx.applicationCategoryRequest.create({
      data: { ...data, organizationId: round.organizationId, applicationId: app.id, fundingRoundId: round.id },
    });
    return app;
  });

  await establishApplicantAccess({
    organizationId: round.organizationId,
    organizationName: round.organization.name,
    granteeId: grantee.id,
    contactName,
    contactEmail,
  });

  redirect(`/apply/${roundId}/submitted?application=${application.id}`);
}

'use server';

import { redirect } from 'next/navigation';
import { prisma } from '@/lib/db';

function text(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === 'string' ? value.trim() : '';
}

export async function submitPublicApplicationAction(roundId: string, formData: FormData) {
  const round = await prisma.fundingRound.findUnique({ where: { id: roundId } });
  if (!round || round.status !== 'OPEN') redirect(`/apply/${roundId}?error=closed`);

  const now = new Date();
  if (round.opensAt && now < round.opensAt) redirect(`/apply/${roundId}?error=closed`);
  if (round.closesAt && now > round.closesAt) redirect(`/apply/${roundId}?error=closed`);

  const legalName = text(formData, 'legalName');
  const ein = text(formData, 'ein');
  const contactName = text(formData, 'contactName');
  const contactEmail = text(formData, 'contactEmail').toLowerCase();
  const category = text(formData, 'category');
  const requestedAmount = Number(text(formData, 'requestedAmount'));

  if (!legalName || !contactName || !contactEmail || !category || !Number.isFinite(requestedAmount) || requestedAmount <= 0) {
    redirect(`/apply/${roundId}?error=required`);
  }
  if (!round.categories.includes(category)) redirect(`/apply/${roundId}?error=category`);

  const certified = ['notOnWatchList', 'patriotActCompliant', 'notDebarred'].every(
    (key) => formData.get(key) === 'on',
  );
  if (!certified) redirect(`/apply/${roundId}?error=certifications`);

  const existingGrantee = ein
    ? await prisma.grantee.findFirst({ where: { organizationId: round.organizationId, ein } })
    : await prisma.grantee.findFirst({ where: { organizationId: round.organizationId, contactEmail } });

  const existingApplication = existingGrantee
    ? await prisma.granteeApplication.findUnique({
        where: { fundingRoundId_granteeId: { fundingRoundId: round.id, granteeId: existingGrantee.id } },
      })
    : null;
  if (existingApplication) redirect(`/apply/${roundId}?error=duplicate`);

  await prisma.$transaction(async (tx) => {
    const grantee = existingGrantee ?? await tx.grantee.create({
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

    if (existingGrantee) {
      await tx.grantee.update({
        where: { id: grantee.id },
        data: { contactName, contactEmail, contactPhone: text(formData, 'contactPhone') || null },
      });
    }

    const application = await tx.granteeApplication.create({
      data: {
        organizationId: round.organizationId,
        fundingRoundId: round.id,
        granteeId: grantee.id,
        notOnWatchList: true,
        patriotActCompliant: true,
        notDebarred: true,
        status: 'SUBMITTED',
        submittedAt: now,
      },
    });

    await tx.applicationCategoryRequest.create({
      data: {
        organizationId: round.organizationId,
        applicationId: application.id,
        fundingRoundId: round.id,
        category,
        requestedAmount,
        targetPopulation: text(formData, 'targetPopulation') || null,
        intakeProcess: text(formData, 'intakeProcess') || null,
        deliveryMethod: text(formData, 'deliveryMethod') || null,
        county: text(formData, 'county') || null,
        serviceLocation: text(formData, 'serviceLocation') || null,
        unitsProjected: Number(text(formData, 'unitsProjected')) || null,
      },
    });
  });

  redirect(`/apply/${roundId}/submitted`);
}

'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { Role, SequenceEnrollmentStatus } from '@prisma/client';
import { auth } from '@/auth';
import { prisma } from '@/lib/db';
import { forOrg } from '@/lib/tenant-db';
import { assertRole } from '@/lib/permissions';
import { renderTemplate } from '@/lib/email-templates';
import { sendAndLogDonorEmail } from '@/lib/actions/send-email';
import { donorDisplayName } from '@/lib/format';

export type ActionState = { error?: string; success?: string } | undefined;

export async function startSequenceAction(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const session = await auth();
  if (!session) redirect('/login');
  assertRole(session.user.role as Role, Role.FUNDRAISER);

  const donorId = formData.get('donorId');
  const sequenceTemplateId = formData.get('sequenceTemplateId');
  if (typeof donorId !== 'string' || !donorId) return { error: 'Missing donor.' };
  if (typeof sequenceTemplateId !== 'string' || !sequenceTemplateId) {
    return { error: 'Missing sequence.' };
  }

  const db = forOrg(session.user.organizationId);

  const existingActive = await db.donorSequenceEnrollment.findFirst({
    where: { donorId, status: SequenceEnrollmentStatus.ACTIVE },
  });
  if (existingActive) {
    return { error: 'This donor already has an active sequence — end it first to start a different one.' };
  }

  const template = await db.sequenceTemplate.findUnique({
    where: { id: sequenceTemplateId },
    include: { steps: { orderBy: { sortOrder: 'asc' } } },
  });
  if (!template || template.steps.length === 0) {
    return { error: 'That sequence has no steps to send yet.' };
  }

  await db.donorSequenceEnrollment.create({
    data: {
      organizationId: session.user.organizationId,
      donorId,
      sequenceTemplateId,
      enrolledById: session.user.id,
    },
  });

  revalidatePath(`/donors/${donorId}`);
  revalidatePath('/dashboard');
  return { success: 'Sequence started.' };
}

/**
 * Sends whichever step is currently due for this enrollment, then
 * advances currentStepOrder — or marks the enrollment COMPLETED if
 * that was the last step. Reuses the exact same send+log+recalculate
 * path as composing an email manually; the only difference is that
 * the template and merge-rendering happen server-side here rather than
 * a person picking a template in the compose panel.
 */
export async function sendSequenceStepAction(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const session = await auth();
  if (!session) redirect('/login');
  assertRole(session.user.role as Role, Role.FUNDRAISER);

  const enrollmentId = formData.get('enrollmentId');
  if (typeof enrollmentId !== 'string' || !enrollmentId) return { error: 'Missing enrollment.' };

  const db = forOrg(session.user.organizationId);

  const enrollment = await db.donorSequenceEnrollment.findUnique({
    where: { id: enrollmentId },
    include: {
      donor: true,
      sequenceTemplate: { include: { steps: { orderBy: { sortOrder: 'asc' } } } },
    },
  });
  if (!enrollment) return { error: 'Enrollment not found.' };
  if (enrollment.status !== SequenceEnrollmentStatus.ACTIVE) {
    return { error: 'This sequence is no longer active.' };
  }
  if (!enrollment.donor.email) {
    return { error: 'This donor has no email address on file.' };
  }

  const currentStep = enrollment.sequenceTemplate.steps.find(
    (s) => s.sortOrder === enrollment.currentStepOrder,
  );
  if (!currentStep) return { error: 'Could not find the current step.' };

  const emailTemplate = await db.emailTemplate.findUnique({ where: { id: currentStep.emailTemplateId } });
  if (!emailTemplate) return { error: 'The email template for this step no longer exists.' };

  const organization = await prisma.organization.findUnique({
    where: { id: session.user.organizationId },
    select: { name: true },
  });

  const mergeCtx = {
    firstName: enrollment.donor.firstName,
    lastName: enrollment.donor.lastName,
    donorName: donorDisplayName(enrollment.donor),
    organizationName: organization?.name ?? 'your organization',
    fundraiserName: session.user.name ?? session.user.email ?? 'Your fundraising team',
  };

  const subject = renderTemplate(emailTemplate.subject, mergeCtx);
  const body = renderTemplate(emailTemplate.body, mergeCtx);

  try {
    await sendAndLogDonorEmail({
      db,
      organizationId: session.user.organizationId,
      userId: session.user.id,
      donorId: enrollment.donorId,
      donorEmail: enrollment.donor.email,
      subject,
      body,
    });
  } catch (err) {
    console.error('Send sequence step error:', err);
    return { error: err instanceof Error ? err.message : 'Could not send that email — try again.' };
  }

  await db.donorSequenceStepLog.create({
    data: {
      organizationId: session.user.organizationId,
      enrollmentId: enrollment.id,
      stepOrder: currentStep.sortOrder,
      sentById: session.user.id,
    },
  });

  const isLastStep = currentStep.sortOrder >= enrollment.sequenceTemplate.steps.length - 1;
  await db.donorSequenceEnrollment.update({
    where: { id: enrollment.id },
    data: isLastStep
      ? { status: SequenceEnrollmentStatus.COMPLETED, endedAt: new Date() }
      : { currentStepOrder: enrollment.currentStepOrder + 1 },
  });

  revalidatePath(`/donors/${enrollment.donorId}`);
  revalidatePath('/dashboard');
  return { success: isLastStep ? 'Sequence complete.' : 'Step sent.' };
}

export async function endSequenceEarlyAction(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const session = await auth();
  if (!session) redirect('/login');
  assertRole(session.user.role as Role, Role.FUNDRAISER);

  const enrollmentId = formData.get('enrollmentId');
  if (typeof enrollmentId !== 'string' || !enrollmentId) return { error: 'Missing enrollment.' };

  const db = forOrg(session.user.organizationId);
  const enrollment = await db.donorSequenceEnrollment.findUnique({ where: { id: enrollmentId } });
  if (!enrollment) return { error: 'Enrollment not found.' };

  await db.donorSequenceEnrollment.update({
    where: { id: enrollmentId },
    data: { status: SequenceEnrollmentStatus.ENDED_EARLY, endedAt: new Date() },
  });

  revalidatePath(`/donors/${enrollment.donorId}`);
  revalidatePath('/dashboard');
  return { success: 'Sequence ended.' };
}

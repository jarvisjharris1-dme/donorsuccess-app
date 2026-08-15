'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { Role, InteractionType } from '@prisma/client';
import { auth } from '@/auth';
import { forOrg } from '@/lib/tenant-db';
import type { ScopedPrisma } from '@/lib/tenant-db';
import { assertRole } from '@/lib/permissions';
import { recalculateDonorHealthScore } from '@/lib/scoring/recalculate';
import { sendEmailAsUser } from '@/lib/integrations/email-send';

export type ActionState = { error?: string; success?: string } | undefined;

/**
 * The actual send+log+recalculate sequence, shared between the regular
 * donor-page compose flow and the Success Sequence "Send" action —
 * both need the exact same behavior (send first, log second, never a
 * false record on a failed send), just triggered from different UI.
 */
export async function sendAndLogDonorEmail(params: {
  db: ScopedPrisma;
  organizationId: string;
  userId: string;
  donorId: string;
  donorEmail: string;
  subject: string;
  body: string;
}): Promise<void> {
  // Send first, log second — a failed send should never produce a
  // false record claiming contact happened.
  await sendEmailAsUser({ userId: params.userId, to: params.donorEmail, subject: params.subject, body: params.body });

  await params.db.$transaction(async (tx) => {
    await tx.interaction.create({
      data: {
        donorId: params.donorId,
        type: InteractionType.EMAIL,
        subject: params.subject,
        notes: params.body,
        occurredAt: new Date(),
        loggedById: params.userId,
        organizationId: params.organizationId,
      },
    });
    // Sending an email is a genuine touchpoint — feeds the engagement
    // factor the same way manually logging an interaction does.
    await recalculateDonorHealthScore(tx, params.donorId);
  });
}

export async function sendDonorEmailAction(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const session = await auth();
  if (!session) redirect('/login');
  assertRole(session.user.role as Role, Role.FUNDRAISER);

  const donorId = formData.get('donorId');
  const subject = formData.get('subject');
  const body = formData.get('body');

  if (typeof donorId !== 'string' || !donorId) return { error: 'Missing donor.' };
  if (typeof subject !== 'string' || !subject.trim()) return { error: 'Subject is required.' };
  if (typeof body !== 'string' || !body.trim()) return { error: 'Message body is required.' };

  const db = forOrg(session.user.organizationId);
  const donor = await db.donor.findUnique({ where: { id: donorId } });
  if (!donor) return { error: 'Donor not found.' };
  if (!donor.email) return { error: 'This donor has no email address on file.' };

  try {
    await sendAndLogDonorEmail({
      db,
      organizationId: session.user.organizationId,
      userId: session.user.id,
      donorId,
      donorEmail: donor.email,
      subject,
      body,
    });
  } catch (err) {
    console.error('Send donor email error:', err);
    return {
      error: err instanceof Error ? err.message : 'Could not send that email — try again.',
    };
  }

  revalidatePath(`/donors/${donorId}`);
  return { success: 'Email sent.' };
}

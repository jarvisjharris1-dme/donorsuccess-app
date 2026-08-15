'use server';

import { z } from 'zod';
import { auth } from '@/auth';
import { prisma } from '@/lib/db';
import { sendEmail } from '@/lib/email/resend';
import { supportRequestEmail } from '@/lib/email/templates/support-request';

export type ActionState = { error?: string; success?: string } | undefined;

const SUPPORT_EMAIL = 'support@donorsuccess.com';

const supportRequestSchema = z.object({
  subject: z.string().trim().min(1, 'Give this a short subject').max(150),
  message: z.string().trim().min(1, 'Describe what you need help with').max(5000),
});

export async function submitSupportRequestAction(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const session = await auth();
  if (!session) return { error: 'You need to be logged in to submit a support request.' };

  const parsed = supportRequestSchema.safeParse({
    subject: formData.get('subject'),
    message: formData.get('message'),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Check the form for errors.' };
  }

  const organization = await prisma.organization.findUnique({
    where: { id: session.user.organizationId },
    select: { name: true },
  });

  const { subject, html, text } = supportRequestEmail({
    reporterName: session.user.name ?? session.user.email ?? 'Someone',
    reporterEmail: session.user.email ?? 'unknown',
    organizationName: organization?.name ?? 'Unknown organization',
    subject: parsed.data.subject,
    message: parsed.data.message,
  });

  try {
    await sendEmail({
      to: SUPPORT_EMAIL,
      subject,
      html,
      text,
      // So hitting "Reply" in the support inbox goes straight back to
      // the customer, not to the noreply sending address.
      replyTo: session.user.email ?? undefined,
    });
  } catch (err) {
    console.error('Support request email failed to send:', err);
    return { error: 'Could not send your request — try again in a moment, or email support@donorsuccess.com directly.' };
  }

  return { success: "Sent. We'll follow up at your email as soon as we can." };
}

import { Resend } from 'resend';

let client: Resend | null = null;

function getClient(): Resend {
  if (!client) {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      throw new Error('RESEND_API_KEY is not set.');
    }
    client = new Resend(apiKey);
  }
  return client;
}

export type SendEmailParams = {
  to: string;
  subject: string;
  html: string;
  text: string;
  replyTo?: string;
};

/**
 * Sends a transactional email via Resend. Callers should generally
 * wrap this in a try/catch and not let a send failure block the
 * underlying action — e.g. password reset tokens are still created and
 * usable via the manual "Pending password resets" admin fallback even
 * if the email itself fails to send.
 */
export async function sendEmail(params: SendEmailParams): Promise<void> {
  // Falls back to Resend's shared onboarding sender, which works
  // immediately with zero setup but is meant for testing only — it
  // will hurt deliverability at any real volume. Set EMAIL_FROM once a
  // sending domain is verified in the Resend dashboard (see README).
  const from = process.env.EMAIL_FROM || 'Donor Success <onboarding@resend.dev>';

  const { error } = await getClient().emails.send({
    from,
    to: params.to,
    subject: params.subject,
    html: params.html,
    text: params.text,
    ...(params.replyTo ? { replyTo: params.replyTo } : {}),
  });

  if (error) {
    throw new Error(`Resend send failed: ${error.message}`);
  }
}

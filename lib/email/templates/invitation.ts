export function invitationEmail(params: {
  acceptUrl: string;
  organizationName: string;
  inviterName: string;
  recipientName?: string;
}): { subject: string; html: string; text: string } {
  const greeting = params.recipientName ? `Hi ${params.recipientName},` : 'Hi,';
  const subject = `${params.inviterName} invited you to join ${params.organizationName} on Donor Success`;

  const text = [
    `${greeting}`,
    '',
    `${params.inviterName} has invited you to join ${params.organizationName} on Donor Success.`,
    '',
    `Accept the invitation here: ${params.acceptUrl}`,
    '',
    'This link expires in 7 days.',
  ].join('\n');

  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 480px; margin: 0 auto; padding: 32px 24px;">
      <h1 style="color: #0F172A; font-size: 20px; margin: 0 0 16px;">You're invited to Donor Success</h1>
      <p style="color: #475569; font-size: 14px; line-height: 1.6; margin: 0 0 24px;">
        ${greeting} ${params.inviterName} has invited you to join <strong>${params.organizationName}</strong>
        on Donor Success. Click below to set up your account.
      </p>
      <a href="${params.acceptUrl}" style="display: inline-block; background: #0F766E; color: #ffffff; padding: 12px 24px; border-radius: 10px; text-decoration: none; font-weight: 600; font-size: 14px;">
        Accept Invitation
      </a>
      <p style="color: #94a3b8; font-size: 12px; line-height: 1.6; margin: 32px 0 0;">
        This link expires in 7 days. If you weren't expecting this invitation, you can safely ignore this email.
      </p>
    </div>
  `;

  return { subject, html, text };
}

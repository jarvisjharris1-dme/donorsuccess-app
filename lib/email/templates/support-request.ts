export function supportRequestEmail(params: {
  reporterName: string;
  reporterEmail: string;
  organizationName: string;
  subject: string;
  message: string;
}): { subject: string; html: string; text: string } {
  const { reporterName, reporterEmail, organizationName, subject, message } = params;

  const emailSubject = `Support request: ${subject}`;

  const text = [
    `New support request from ${reporterName} (${reporterEmail}) at ${organizationName}.`,
    '',
    `Subject: ${subject}`,
    '',
    message,
    '',
    `Reply directly to this email to respond to ${reporterName}.`,
  ].join('\n');

  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 480px; margin: 0 auto; padding: 32px 24px;">
      <h1 style="color: #0F172A; font-size: 20px; margin: 0 0 16px;">New support request</h1>
      <p style="color: #475569; font-size: 14px; line-height: 1.6; margin: 0 0 4px;">
        <strong>${reporterName}</strong> (${reporterEmail})
      </p>
      <p style="color: #94a3b8; font-size: 13px; margin: 0 0 20px;">${organizationName}</p>
      <p style="color: #0F172A; font-size: 15px; font-weight: 600; margin: 0 0 8px;">${subject}</p>
      <p style="color: #475569; font-size: 14px; line-height: 1.6; margin: 0 0 24px; white-space: pre-wrap;">${message}</p>
      <p style="color: #94a3b8; font-size: 13px; margin: 0;">
        Reply directly to this email to respond to ${reporterName}.
      </p>
    </div>
  `;

  return { subject: emailSubject, html, text };
}

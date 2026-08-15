export function passwordResetEmail(resetUrl: string): { subject: string; html: string; text: string } {
  const subject = 'Reset your Donor Success password';

  const text = [
    'Reset your Donor Success password',
    '',
    `Click this link to set a new password: ${resetUrl}`,
    '',
    'This link expires in 1 hour. If you did not request this, you can safely ignore this email.',
  ].join('\n');

  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 480px; margin: 0 auto; padding: 32px 24px;">
      <h1 style="color: #0F172A; font-size: 20px; margin: 0 0 16px;">Reset your password</h1>
      <p style="color: #475569; font-size: 14px; line-height: 1.6; margin: 0 0 24px;">
        Click the button below to set a new password for your Donor Success account. This link expires in 1 hour.
      </p>
      <a href="${resetUrl}" style="display: inline-block; background: #0F766E; color: #ffffff; padding: 12px 24px; border-radius: 10px; text-decoration: none; font-weight: 600; font-size: 14px;">
        Reset Password
      </a>
      <p style="color: #94a3b8; font-size: 12px; line-height: 1.6; margin: 32px 0 0;">
        If you didn't request this, you can safely ignore this email — your password won't be changed.
      </p>
    </div>
  `;

  return { subject, html, text };
}

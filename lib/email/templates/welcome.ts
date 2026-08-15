export function welcomeEmail(params: {
  organizationName: string;
  recipientName: string;
  appUrl: string;
}): { subject: string; html: string; text: string } {
  const { organizationName, recipientName, appUrl } = params;

  const subject = `Welcome to Donor Success, ${recipientName}`;

  const text = [
    `Welcome to Donor Success, ${recipientName}!`,
    '',
    `Thank you for starting this journey with us. ${organizationName} is exactly the kind of organization we built Donor Success for, and I'm genuinely glad you're here.`,
    '',
    `A few things worth knowing as you get started:`,
    '',
    `- A handful of ready-to-use email templates and Success Sequences are already loaded — check Settings before building your own.`,
    `- The Success Hub (in the main navigation) has a full walkthrough of every feature, including a Getting Started checklist.`,
    `- Health scores and retention risk start showing up automatically once you've added a few donors and logged some gift history.`,
    '',
    `Jump in: ${appUrl}/dashboard`,
    '',
    `This inbox is read personally — if you ever have a question, someone from our support team will follow up with you directly.`,
    '',
    `Thank you again for your trust,`,
    '',
    `Jarvis Harris`,
    `Founder & CEO, Donor Success`,
  ].join('\n');

  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 480px; margin: 0 auto; padding: 32px 24px;">
      <h1 style="color: #0F172A; font-size: 20px; margin: 0 0 16px;">Welcome to Donor Success, ${recipientName}!</h1>
      <p style="color: #475569; font-size: 14px; line-height: 1.6; margin: 0 0 20px;">
        Thank you for starting this journey with us. ${organizationName} is exactly the kind of organization we built Donor Success for, and I'm genuinely glad you're here.
      </p>
      <p style="color: #475569; font-size: 14px; line-height: 1.6; margin: 0 0 12px;">
        A few things worth knowing as you get started:
      </p>
      <ul style="color: #475569; font-size: 14px; line-height: 1.7; margin: 0 0 24px; padding-left: 20px;">
        <li>A handful of ready-to-use email templates and Success Sequences are already loaded &mdash; check Settings before building your own.</li>
        <li>The Success Hub (in the main navigation) has a full walkthrough of every feature, including a Getting Started checklist.</li>
        <li>Health scores and retention risk start showing up automatically once you've added a few donors and logged some gift history.</li>
      </ul>
      <a href="${appUrl}/dashboard" style="display: inline-block; background: #0F766E; color: #ffffff; padding: 12px 24px; border-radius: 10px; text-decoration: none; font-weight: 600; font-size: 14px; margin-bottom: 28px;">
        Go to your dashboard
      </a>
      <p style="color: #475569; font-size: 14px; line-height: 1.6; margin: 0 0 28px;">
        This inbox is read personally &mdash; if you ever have a question, someone from our support team will follow up with you directly.
      </p>
      <p style="color: #475569; font-size: 14px; line-height: 1.6; margin: 0 0 4px;">
        Thank you again for your trust,
      </p>
      <img src="${appUrl}/jarvis-signature.png" alt="Jarvis Harris signature" style="height: 56px; width: auto; margin: 4px 0 2px; display: block;" />
      <p style="color: #0F172A; font-size: 14px; font-weight: 600; margin: 0; line-height: 1.4;">
        Jarvis Harris
      </p>
      <p style="color: #94a3b8; font-size: 13px; margin: 2px 0 0; line-height: 1.4;">
        Founder &amp; CEO, Donor Success
      </p>
    </div>
  `;

  return { subject, html, text };
}

import { GRACE_PERIOD_DAYS, DATA_DELETION_DAYS } from '@/lib/billing-policy';

export function subscriptionIssueEmail(params: {
  organizationName: string;
  manageBillingUrl: string;
  reason: 'past_due' | 'canceled' | 'unpaid' | 'incomplete_expired';
}): { subject: string; html: string; text: string } {
  const reasonText =
    params.reason === 'canceled'
      ? 'your subscription was canceled'
      : 'we weren\u2019t able to process your last payment';

  const subject = `Action needed: ${reasonText} for ${params.organizationName}`;

  const text = [
    `${params.organizationName}'s Donor Success subscription needs attention — ${reasonText}.`,
    '',
    `You have ${GRACE_PERIOD_DAYS} days of uninterrupted access to fix this before the account is` +
      ' restricted, and your data will be retained for ' +
      `${DATA_DELETION_DAYS} days total before deletion if the subscription isn't reactivated.`,
    '',
    `Manage billing: ${params.manageBillingUrl}`,
  ].join('\n');

  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 480px; margin: 0 auto; padding: 32px 24px;">
      <h1 style="color: #0F172A; font-size: 20px; margin: 0 0 16px;">Your subscription needs attention</h1>
      <p style="color: #475569; font-size: 14px; line-height: 1.6; margin: 0 0 16px;">
        ${params.organizationName}'s Donor Success subscription needs attention &mdash; ${reasonText}.
      </p>
      <p style="color: #475569; font-size: 14px; line-height: 1.6; margin: 0 0 24px;">
        You have <strong>${GRACE_PERIOD_DAYS} days</strong> of uninterrupted access to fix this before
        the account is restricted. If the subscription isn't reactivated, your data will be retained
        for <strong>${DATA_DELETION_DAYS} days total</strong> from today before it's permanently deleted.
      </p>
      <a href="${params.manageBillingUrl}" style="display: inline-block; background: #0F766E; color: #ffffff; padding: 12px 24px; border-radius: 10px; text-decoration: none; font-weight: 600; font-size: 14px;">
        Manage billing
      </a>
    </div>
  `;

  return { subject, html, text };
}

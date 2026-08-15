export function grantDeadlineReminderEmail(params: {
  itemLabel: string;
  grantName: string;
  funderName: string;
  dueDateLabel: string;
  isOverdue: boolean;
  daysUntil: number;
  grantUrl: string;
}): { subject: string; html: string; text: string } {
  const { itemLabel, grantName, funderName, dueDateLabel, isOverdue, daysUntil, grantUrl } = params;

  const timing = isOverdue
    ? 'is now overdue'
    : daysUntil === 0
      ? 'is due today'
      : `is due in ${daysUntil} day${daysUntil === 1 ? '' : 's'}`;

  const subject = isOverdue
    ? `Overdue: ${itemLabel} — ${funderName}`
    : `Due in ${daysUntil} day${daysUntil === 1 ? '' : 's'}: ${itemLabel} — ${funderName}`;

  const text = [
    `${itemLabel} for ${grantName} (${funderName}) ${timing} — ${dueDateLabel}.`,
    '',
    `View the grant: ${grantUrl}`,
  ].join('\n');

  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 480px; margin: 0 auto; padding: 32px 24px;">
      <h1 style="color: #0F172A; font-size: 20px; margin: 0 0 16px;">
        ${isOverdue ? 'Overdue' : 'Coming up'}: ${itemLabel}
      </h1>
      <p style="color: #475569; font-size: 14px; line-height: 1.6; margin: 0 0 8px;">
        <strong>${grantName}</strong> &mdash; ${funderName}
      </p>
      <p style="color: ${isOverdue ? '#DC2626' : '#475569'}; font-size: 14px; line-height: 1.6; margin: 0 0 24px; font-weight: ${isOverdue ? '600' : '400'};">
        ${itemLabel} ${timing} &mdash; ${dueDateLabel}.
      </p>
      <a href="${grantUrl}" style="display: inline-block; background: #0F766E; color: #ffffff; padding: 12px 24px; border-radius: 10px; text-decoration: none; font-weight: 600; font-size: 14px;">
        View grant
      </a>
    </div>
  `;

  return { subject, html, text };
}

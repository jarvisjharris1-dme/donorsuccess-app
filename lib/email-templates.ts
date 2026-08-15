export const MERGE_FIELDS = [
  { token: '{{firstName}}', label: "Donor's first name" },
  { token: '{{lastName}}', label: "Donor's last name" },
  { token: '{{donorName}}', label: 'Donor or organization display name' },
  { token: '{{organizationName}}', label: 'Your organization\u2019s name' },
  { token: '{{fundraiserName}}', label: 'Your name (the sender)' },
] as const;

export type MergeContext = {
  firstName?: string | null;
  lastName?: string | null;
  donorName: string;
  organizationName: string;
  fundraiserName: string;
};

/** Replaces {{mergeField}} tokens with real values. Unknown tokens are left as-is rather than silently dropped, so a typo is visible instead of hidden. */
export function renderTemplate(text: string, ctx: MergeContext): string {
  return text
    .replace(/\{\{firstName\}\}/g, ctx.firstName ?? '')
    .replace(/\{\{lastName\}\}/g, ctx.lastName ?? '')
    .replace(/\{\{donorName\}\}/g, ctx.donorName)
    .replace(/\{\{organizationName\}\}/g, ctx.organizationName)
    .replace(/\{\{fundraiserName\}\}/g, ctx.fundraiserName);
}

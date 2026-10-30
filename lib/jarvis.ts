import { z } from 'zod';

// V1 reuses durable Tasks; it adds no tables and never changes gift records.
export const JARVIS_DRAFT_PREFIX = 'jarvis-draft:v1:';
export const draftSchema = z.object({
  version: z.literal(1),
  kind: z.literal('jarvis-outreach'),
  status: z.enum(['pending', 'approved', 'rejected']),
  subject: z.string().trim().min(1).max(250),
  body: z.string().trim().min(1).max(12000),
  source: z.string().max(1000),
  approvedBy: z.string().optional(),
  approvedAt: z.string().optional(),
});
export type JarvisDraft = z.infer<typeof draftSchema>;
export function readDraft(description: string | null): JarvisDraft | null {
  if (!description?.startsWith(JARVIS_DRAFT_PREFIX)) return null;
  try {
    const parsed = draftSchema.safeParse(JSON.parse(description.slice(JARVIS_DRAFT_PREFIX.length)));
    return parsed.success ? parsed.data : null;
  } catch { return null; }
}
export function writeDraft(draft: JarvisDraft): string {
  return JARVIS_DRAFT_PREFIX + JSON.stringify(draftSchema.parse(draft));
}
export function hasPlaceholders(body: string): boolean {
  return /\[[^\]]+\]|\{\{[^}]+\}\}/.test(body);
}

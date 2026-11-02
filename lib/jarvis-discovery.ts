import { z } from 'zod';

export const publicUrl = z.string().url().max(2000).refine(value => {
  try { const u = new URL(value); const h = u.hostname.toLowerCase();
    return u.protocol === 'https:' && !u.username && !u.password && (!u.port || u.port === '443') && h.includes('.') && !h.endsWith('.local') && h !== 'localhost' && !/^[\d.:]+$/.test(h) && !h.includes(':');
  } catch { return false; }
}, 'Use a public HTTPS source URL.');
export const discoveryProfileSchema = z.object({
  mission: z.string().trim().min(30).max(1500),
  focusAreas: z.string().trim().min(5).max(1000),
  geography: z.string().trim().min(3).max(600),
  missionSource: publicUrl,
  sourceHints: z.string().trim().max(2000).default(''),
  exclusions: z.string().trim().max(1000).default(''),
});
export type DiscoveryProfile = z.infer<typeof discoveryProfileSchema>;
export const discoveryRequestSchema = z.object({ category: z.enum(['Corporate','Individual']), profile: discoveryProfileSchema });
export const prospectSchema = z.object({
  name: z.string().trim().min(2).max(160),
  matchedFocus: z.string().trim().min(3).max(300),
  rationale: z.string().trim().min(20).max(1500),
  geographicConnection: z.string().trim().min(10).max(600),
  outreachAngle: z.string().trim().min(10).max(700),
  nextStep: z.string().trim().min(5).max(500),
  evidenceIndexes: z.array(z.number().int().min(0)).min(1).max(3),
});
export const discoveryOutputSchema = z.object({ prospects: z.array(prospectSchema).max(5) });
export type WebEvidence = { url: string; title: string; excerpt: string };
export function collectWebEvidence(content: unknown): WebEvidence[] {
  if (!Array.isArray(content)) return [];
  const seen = new Set<string>(), result: WebEvidence[] = [];
  for (const block of content) {
    if (!block || block.type !== 'text' || !Array.isArray(block.citations)) continue;
    for (const c of block.citations) {
      if (c?.type !== 'web_search_result_location' || !publicUrl.safeParse(c.url).success || typeof c.cited_text !== 'string' || !c.cited_text.trim()) continue;
      const key = c.url + c.cited_text;
      if (seen.has(key)) continue;
      seen.add(key);
      result.push({ url: c.url, title: String(c.title || 'Public source').slice(0,200), excerpt: c.cited_text.slice(0,150) });
    }
  }
  return result.slice(0,30);
}
export function prospectIdentity(name: string) { return name.normalize('NFKC').toLowerCase().replace(/[^\p{L}\p{N}]+/gu,' ').trim(); }
export function defaultDiscoveryProfile(organization: string): DiscoveryProfile {
  if (/united way.*mid.?south/i.test(organization)) return {
    mission: 'Reduce poverty and improve quality of life by mobilizing community resources and advancing economic and social mobility for individuals and families.',
    focusAreas: 'Education; financial stability; health; economic mobility; Driving The Dream two-generation support.',
    geography: 'Shelby, Fayette, Lauderdale and Tipton counties in Tennessee; DeSoto, Tate and Tunica counties in Mississippi; Crittenden County, Arkansas. Greater Memphis / Mid-South.',
    missionSource: 'https://uwmidsouth.org/about/', sourceHints: '', exclusions: '',
  };
  return { mission: '', focusAreas: '', geography: '', missionSource: '', sourceHints: '', exclusions: '' };
}

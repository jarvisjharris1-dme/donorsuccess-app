import { z } from 'zod';

export const LEAD_PREFIX = 'jarvis-lead:v1:';
export const LEAD_STAGES = ['Identified', 'Researching', 'Ready for outreach', 'Contacted', 'Meeting scheduled', 'Qualified', 'Nurture', 'Closed'] as const;
export const LEAD_GOALS = ['Corporate campaign', 'Sponsorship', 'Individual giving', 'Foundation introduction', 'Stewardship', 'Reactivation'] as const;
const text = (max: number) => z.string().trim().max(max);
export const leadSchema = z.object({
  version: z.literal(1), category: z.enum(['Corporate', 'Individual']).default('Individual'), name: text(160).min(1, 'Lead name is required.'),
  contact: text(120), email: z.union([z.literal(''), z.string().trim().email().max(254)]),
  goal: z.enum(LEAD_GOALS), stage: z.enum(LEAD_STAGES),
  rationale: text(2000).min(1, 'Explain why this lead is a fit.'),
  source: text(1500).min(1, 'Add the source or referral for this lead.'),
  nextStep: text(500).min(1, 'Add a next step.'),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH']),
  dueDate: z.union([z.literal(''), z.string().regex(/^\d{4}-\d{2}-\d{2}$/)]).refine(s => !s || (!Number.isNaN(Date.parse(s)) && new Date(s).toISOString().slice(0, 10) === s), 'Choose a valid date.'),
  donorId: z.string().max(100).optional(),
  fit: z.enum(['unknown', 'plausible', 'verified']).default('unknown'),
  relationship: z.enum(['cold', 'referral', 'known', 'active']).default('cold'),
  capacity: z.enum(['unknown', 'suggested', 'demonstrated']).default('unknown'),
  timing: z.enum(['unknown', 'later', 'soon', 'now']).default('unknown'),
  qualityEvidence: text(2000).default(''),
  discovery: z.object({
    matchedFocus: text(300), geographicConnection: text(600), outreachAngle: text(700), searchedAt: z.string().datetime(),
    evidence: z.array(z.object({ url: z.string().url().max(2000), title: text(200), excerpt: text(150) })).max(3),
    status: z.literal('research hypothesis'),
  }).optional(),
  subject: text(250), body: text(12000),
  communicationStatus: z.enum(['not prepared', 'pending review', 'approved']),
  approvedBy: z.string().optional(), approvedAt: z.string().datetime().optional(),
});
export type Lead = z.infer<typeof leadSchema>;
export type LeadRow = Lead & { id: string; updatedAt: string; owner: string; canEdit: boolean };
export function readLead(description: string | null): Lead | null {
  if (!description?.startsWith(LEAD_PREFIX)) return null;
  try { const result = leadSchema.safeParse(JSON.parse(description.slice(LEAD_PREFIX.length))); return result.success ? result.data : null; }
  catch { return null; }
}
export function writeLead(lead: Lead) { return LEAD_PREFIX + JSON.stringify(leadSchema.parse(lead)); }
export function emptyLead(): Lead {
  return { version: 1, category: 'Corporate', name: '', contact: '', email: '', goal: 'Corporate campaign', stage: 'Identified', rationale: '', source: '', nextStep: 'Verify the contact and arrange an introduction', priority: 'MEDIUM', dueDate: '', subject: '', body: '', communicationStatus: 'not prepared', fit: 'unknown', relationship: 'cold', capacity: 'unknown', timing: 'unknown', qualityEvidence: '' };
}
export function proposeCommunication(lead: Lead, organization: string, sender: string) {
  const subjects: Record<Lead['goal'], string> = {
    'Corporate campaign': `Exploring a workplace campaign with ${organization}`,
    'Sponsorship': `Exploring sponsorship opportunities with ${organization}`,
    'Individual giving': `An introduction to ${organization}`,
    'Foundation introduction': `An introductory conversation with ${organization}`,
    'Stewardship': `Connecting with you about ${organization}`,
    'Reactivation': `An opportunity to reconnect with ${organization}`,
  };
  const asks: Record<Lead['goal'], string> = {
    'Corporate campaign': 'explore whether a workplace giving campaign could be a fit for your team',
    'Sponsorship': 'explore potential sponsorship opportunities and understand your priorities',
    'Individual giving': 'share more about our work and learn about your philanthropic interests',
    'Foundation introduction': 'learn about your funding priorities and discuss whether our work may align',
    'Stewardship': 'share an update on our work and hear what matters most to you',
    'Reactivation': 'reconnect and learn about your current interests',
  };
  return { subject: subjects[lead.goal].slice(0, 250), body: `Hi ${lead.contact || '[Contact name]'},\n\nI’m reaching out from ${organization}. I’d welcome the opportunity to ${asks[lead.goal]}.\n\n[Add one verified sentence connecting this outreach to the lead’s interests or your introduction.]\n\nWould you be open to a brief introductory conversation?\n\nThank you,\n${sender || '[Fundraiser name]'}` };
}
export function preserveApproval(previous: Lead | null, next: Lead): Lead {
  // Recipient, targeting, provenance, or message changes require a fresh review.
  const fields = ['name', 'category', 'contact', 'email', 'goal', 'rationale', 'source', 'subject', 'body', 'qualityEvidence'] as const;
  const unchanged = previous?.communicationStatus === 'approved' && fields.every(k => previous[k] === next[k]);
  return { ...next, communicationStatus: unchanged ? 'approved' : next.subject && next.body ? 'pending review' : 'not prepared',
    approvedBy: unchanged ? previous.approvedBy : undefined, approvedAt: unchanged ? previous.approvedAt : undefined };
}

export const QUALITY_LABELS = {
  fit: { unknown: 'Not researched', plausible: 'Possible alignment', verified: 'Documented alignment' },
  relationship: { cold: 'No known relationship', referral: 'Named referral', known: 'Documented contact', active: 'Active conversation' },
  capacity: { unknown: 'Not researched', suggested: 'Potential, not verified', demonstrated: 'Recorded giving or verified capacity' },
  timing: { unknown: 'Not established', later: 'Later / nurture', soon: 'Within 90 days', now: 'Current opportunity' },
} as const;
export function rateLead(lead: Lead) {
  const fit = { unknown: 0, plausible: 12, verified: 30 }[lead.fit];
  const relationship = { cold: 0, referral: 8, known: 14, active: 20 }[lead.relationship];
  const capacity = { unknown: 0, suggested: 8, demonstrated: 20 }[lead.capacity];
  const contact = lead.contact && lead.email ? 15 : lead.contact ? 5 : 0;
  const timing = { unknown: 0, later: 4, soon: 10, now: 15 }[lead.timing];
  const score = fit + relationship + capacity + contact + timing;
  const missing = [lead.fit === 'unknown' ? 'mission fit' : '', lead.capacity === 'unknown' ? 'giving evidence' : '',
    lead.timing === 'unknown' ? 'timing' : '', !lead.email || !lead.contact ? 'contact details' : '', !lead.qualityEvidence ? 'rating evidence' : ''].filter(Boolean);
  const qualified = lead.fit !== 'unknown' && !!lead.contact && !!lead.email && !!lead.qualityEvidence;
  const grade = !qualified ? 'Needs qualification' : score >= 80 ? 'High' : score >= 55 ? 'Developing' : 'Nurture';
  return { score, grade, missing, factors: [
    { name: 'Mission fit', points: fit, max: 30, reason: QUALITY_LABELS.fit[lead.fit] },
    { name: 'Relationship', points: relationship, max: 20, reason: QUALITY_LABELS.relationship[lead.relationship] },
    { name: 'Giving evidence', points: capacity, max: 20, reason: QUALITY_LABELS.capacity[lead.capacity] },
    { name: 'Contact readiness', points: contact, max: 15, reason: lead.email && lead.contact ? 'Contact name and email recorded; verify before sending' : 'Contact details incomplete' },
    { name: 'Timing', points: timing, max: 15, reason: QUALITY_LABELS.timing[lead.timing] },
  ] };
}

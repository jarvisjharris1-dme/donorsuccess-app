'use server';

import { revalidatePath } from 'next/cache';
import { Role, TaskPriority, TaskStatus } from '@prisma/client';
import { z } from 'zod';
import { auth } from '@/auth';
import { forOrg } from '@/lib/tenant-db';
import { permissions } from '@/lib/permissions';
import { hasPlaceholders } from '@/lib/jarvis';
import { LEAD_PREFIX, emptyLead, rateLead, leadSchema, readLead, writeLead, preserveApproval, proposeCommunication } from '@/lib/jarvis-leads';

const inputSchema = z.object({ id: z.string().min(1).max(100).optional(), updatedAt: z.string().datetime().optional(),
  lead: leadSchema, decision: z.enum(['save', 'prepare', 'approve']) });
export async function saveJarvisLead(input: z.infer<typeof inputSchema>) {
  try {
    const session = await auth();
    if (!session?.user || !permissions.canEditDonors(session.user.role as Role)) return { error: 'A fundraiser account is required.' };
    const user = session.user;
    const parsed = inputSchema.safeParse(input);
    if (!parsed.success) return { error: parsed.error.issues[0]?.message || 'Check the lead details.' };
    const { id, updatedAt, decision } = parsed.data;
    const db = forOrg(user.organizationId);
    const task = id ? await db.task.findFirst({ where: { id, organizationId: user.organizationId } }) : null;
    const previous = task ? readLead(task.description) : null;
    if (id && (!task || !previous || !updatedAt)) return { error: 'Lead not found. Refresh the list.' };
    if (task && task.assignedToId !== user.id && !permissions.canManageUsers(user.role as Role)) return { error: 'Only the lead owner or an administrator can edit this lead.' };
    // Source links are set by the server; a form cannot attach a lead to another donor.
    let lead = preserveApproval(previous, { ...parsed.data.lead, donorId: previous?.donorId });
    if (decision === 'prepare') {
      const org = await db.organization.findUnique({ where: { id: user.organizationId }, select: { name: true } });
      lead = { ...lead, ...proposeCommunication(lead, org?.name || 'our organization', user.name || ''),
        communicationStatus: 'pending review', approvedAt: undefined, approvedBy: undefined };
    }
    if (decision === 'approve') {
      if (!lead.subject || !lead.body) return { error: 'Add a subject and proposed message before approving.' };
      if (!lead.contact || !lead.email) return { error: 'Verify and record a contact name and email before approving.' };
      if (hasPlaceholders(lead.subject + '\n' + lead.body)) return { error: 'Replace all placeholders with verified details before approving.' };
      lead = { ...lead, communicationStatus: 'approved', approvedBy: user.id, approvedAt: new Date().toISOString() };
    }
    const description = writeLead(lead);
    const status = lead.stage === 'Closed' ? TaskStatus.CANCELLED : TaskStatus.OPEN;
    // Noon UTC keeps date-only follow-up values on the intended Central calendar date.
    const dueDate = lead.dueDate ? new Date(lead.dueDate + 'T12:00:00.000Z') : null;
    await db.$transaction(async tx => {
      let entityId = id;
      if (id) {
        const result = await tx.task.updateMany({ where: { id, organizationId: user.organizationId,
          updatedAt: new Date(updatedAt!) }, data: { title: `Jarvis lead: ${lead.name}`, description,
          priority: lead.priority as TaskPriority, dueDate, status, completedAt: null } });
        if (result.count !== 1) throw new Error('STALE');
      } else {
        const created = await tx.task.create({ data: { organizationId: user.organizationId,
          title: `Jarvis lead: ${lead.name}`, description, priority: lead.priority as TaskPriority, dueDate, status,
          assignedToId: user.id, createdById: user.id } });
        entityId = created.id;
      }
      await tx.auditLog.create({ data: { organizationId: user.organizationId, userId: user.id,
        action: `jarvis.lead.${decision}`, entityType: 'Task', entityId: entityId!,
        metadata: { stage: lead.stage, communicationStatus: lead.communicationStatus, delivery: 'manual-only' } } });
    });
    revalidatePath('/jarvis/leads'); revalidatePath('/insights'); revalidatePath('/tasks');
    return { success: decision === 'approve' ? 'Communication approved for manual sending. Nothing was sent.' : decision === 'prepare' ? 'Lead saved with a proposed message. Review it and replace the personalization placeholder.' : 'Lead and next step saved.' };
  } catch { return { error: 'Could not save. Refresh to load the latest version before trying again.' }; }
}

export async function buildJarvisPipeline(scope: 'mine' | 'all') {
  try {
    const session = await auth();
    if (!session?.user || !permissions.canEditDonors(session.user.role as Role)) return { error: 'A fundraiser account is required.' };
    if (scope !== 'mine' && scope !== 'all') return { error: 'Choose a valid portfolio scope.' };
    const user = session.user, db = forOrg(user.organizationId);
    const [donors, org] = await Promise.all([
      db.donor.findMany({ where: { organizationId: user.organizationId, ...(scope === 'mine' ? { assignedToId: user.id } : {}) },
        take: 50, orderBy: { lifetimeGiving: 'desc' }, select: { id: true, firstName: true, lastName: true,
          organizationName: true, email: true, lifetimeGiving: true, lastGiftDate: true, retentionRisk: true,
          _count: { select: { interactions: true } } } }),
      db.organization.findUnique({ where: { id: user.organizationId }, select: { name: true } }),
    ]);
    let createdCount = 0;
    await db.$transaction(async tx => {
      const existing = await tx.task.findMany({ where: { organizationId: user.organizationId,
        assignedToId: user.id, description: { startsWith: LEAD_PREFIX }, donorId: { in: donors.map(d => d.id) } }, select: { donorId: true } });
      const seen = new Set(existing.map(t => t.donorId));
      for (const donor of donors) {
        if (seen.has(donor.id)) continue;
        const name = donor.organizationName || [donor.firstName, donor.lastName].filter(Boolean).join(' ') || 'Unnamed donor';
        const daysSinceGift = donor.lastGiftDate ? Math.floor((Date.now() - donor.lastGiftDate.getTime()) / 86400000) : null;
        const lapsed = daysSinceGift !== null && daysSinceGift > 420;
        const renewalWindow = daysSinceGift !== null && daysSinceGift >= 330 && daysSinceGift <= 420;
        const priorGiving = Number(donor.lifetimeGiving) > 0;
        const lead = { ...emptyLead(), donorId: donor.id, name,
          // Organization names are never treated as a verified person's name.
          contact: [donor.firstName, donor.lastName].filter(Boolean).join(' '), email: donor.email || '',
          goal: (lapsed ? 'Reactivation' : priorGiving ? 'Stewardship' : donor.organizationName ? 'Corporate campaign' : 'Individual giving') as ReturnType<typeof emptyLead>['goal'],
          stage: 'Researching' as const,
          rationale: lapsed ? 'Recorded last gift is more than 420 days ago. Review whether a reengagement conversation is appropriate.' : renewalWindow ? 'Recorded last gift falls within the 330–420 day renewal window. Confirm current plans.' : priorGiving ? 'An existing giving relationship provides a starting point for cultivation or stewardship.' : 'Existing CRM record with no positive cached lifetime giving. Research mission alignment and contact details before outreach.',
          source: `Donor Success donor record /donors/${donor.id}; reviewed ${new Date().toISOString().slice(0,10)}.`,
          fit: priorGiving ? 'plausible' as const : 'unknown' as const,
          relationship: donor._count.interactions > 0 ? 'known' as const : 'cold' as const,
          capacity: priorGiving ? 'demonstrated' as const : 'unknown' as const,
          timing: renewalWindow ? 'now' as const : 'unknown' as const,
          qualityEvidence: `Rules from stored CRM facts: cached lifetime giving ${Number(donor.lifetimeGiving).toFixed(2)}; ${donor._count.interactions} recorded interactions; last gift ${donor.lastGiftDate?.toISOString().slice(0,10) || 'not recorded'}. Giving history is not a current capacity estimate. Mission fit and timing need staff verification.`,
          nextStep: 'Verify the contact, confirm mission fit, and personalize the proposed communication',
        };
        const proposal = proposeCommunication(lead, org?.name || 'our organization', user.name || '');
        const scored = { ...lead, ...proposal, communicationStatus: 'pending review' as const };
        await tx.task.create({ data: { organizationId: user.organizationId, donorId: donor.id,
          title: `Jarvis lead: ${name}`, description: writeLead(scored), assignedToId: user.id, createdById: user.id,
          priority: rateLead(scored).score >= 55 ? TaskPriority.HIGH : TaskPriority.MEDIUM, status: TaskStatus.OPEN } });
        createdCount++;
      }
      await tx.auditLog.create({ data: { organizationId: user.organizationId, userId: user.id,
        action: 'jarvis.pipeline.build', entityType: 'Organization', entityId: user.organizationId,
        metadata: { scope, reviewed: donors.length, created: createdCount, delivery: 'draft-only' } } });
    }, { isolationLevel: 'Serializable', timeout: 30000 });
    revalidatePath('/jarvis/leads'); revalidatePath('/insights'); revalidatePath('/tasks');
    return { success: `Reviewed the top ${donors.length} CRM records by lifetime giving. Added ${createdCount} leads with proposed communications; existing leads were preserved. No messages were sent.` };
  } catch { return { error: 'Pipeline could not be built. Refresh and retry; existing work is preserved.' }; }
}

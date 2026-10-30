'use server';

import { revalidatePath } from 'next/cache';
import { Role, TaskStatus, TaskPriority } from '@prisma/client';
import { z } from 'zod';
import { auth } from '@/auth';
import { forOrg } from '@/lib/tenant-db';
import { permissions } from '@/lib/permissions';
import { donorDisplayName } from '@/lib/format';
import { readDraft, writeDraft, hasPlaceholders, draftSchema, JARVIS_DRAFT_PREFIX } from '@/lib/jarvis';

async function context() {
  const session = await auth();
  if (!session?.user || !permissions.canEditDonors(session.user.role as Role)) {
    throw new Error('You must sign in as a fundraiser to use Jarvis.');
  }
  return { user: session.user, db: forOrg(session.user.organizationId) };
}
function refresh() {
  revalidatePath('/insights');
  revalidatePath('/jarvis');
  revalidatePath('/tasks');
}
export async function createJarvisDraft(donorId: string) {
  try {
    const { user, db } = await context();
    if (!z.string().min(1).max(100).safeParse(donorId).success) return { error: 'Choose a donor.' };
    const donor = await db.donor.findFirst({ where: { id: donorId, organizationId: user.organizationId } });
    if (!donor) return { error: 'Donor not found in your organization.' };
    // Reuse an outstanding draft instead of generating repeat work on every click.
    const existing = await db.task.findFirst({ where: {
      organizationId: user.organizationId, donorId, assignedToId: user.id,
      status: TaskStatus.OPEN, description: { startsWith: JARVIS_DRAFT_PREFIX },
    }, orderBy: { createdAt: 'desc' } });
    if (existing && readDraft(existing.description)?.status === 'pending') {
      return { success: 'An existing draft is ready in Approvals.' };
    }
    const name = donorDisplayName(donor);
    const greeting = donor.firstName || name;
    const org = await db.organization.findUnique({ where: { id: user.organizationId }, select: { name: true } });
    const organizationName = org?.name || 'our organization';
    const payload = writeDraft({ version: 1, kind: 'jarvis-outreach', status: 'pending',
      subject: `A conversation with ${organizationName}`,
      body: `Hi ${greeting},\n\nI’m reaching out from ${organizationName} to connect and learn more about your current interests and priorities. I’d welcome a brief conversation about our work and ways we might stay involved.\n\nWould you be available for a short conversation?\n\nThank you,\n${user.name || '[Fundraiser name]'}`,
      source: `Template-based draft. Donor record: ${donor.id}; name and contact details from Donor Success. No giving amounts, prior promises, or impact claims have been inferred.`,
    });
    const draft = await db.task.create({ data: {
      organizationId: user.organizationId, donorId, title: `Jarvis outreach: ${name}`,
      description: payload, status: TaskStatus.OPEN, priority: TaskPriority.MEDIUM,
      assignedToId: user.id, createdById: user.id,
    } });
    await db.auditLog.create({ data: { organizationId: user.organizationId, userId: user.id,
      action: 'jarvis.draft.create', entityType: 'Task', entityId: draft.id, metadata: { donorId } } });
    refresh();
    return { success: 'Draft saved to Approvals. Nothing was sent.' };
  } catch { return { error: 'Could not prepare the draft. Refresh and try again.' }; }
}
const reviewSchema = z.object({ id: z.string().min(1).max(100), updatedAt: z.string().datetime(),
  subject: draftSchema.shape.subject, body: draftSchema.shape.body,
  decision: z.enum(['save', 'approve', 'reject']) });
export async function reviewJarvisDraft(input: z.infer<typeof reviewSchema>) {
  try {
    const { user, db } = await context();
    const parsed = reviewSchema.safeParse(input);
    if (!parsed.success) return { error: parsed.error.issues[0]?.message || 'Check the draft.' };
    const data = parsed.data;
    const task = await db.task.findFirst({ where: { id: data.id,
      organizationId: user.organizationId, assignedToId: user.id } });
    const draft = task ? readDraft(task.description) : null;
    if (!task || !draft) return { error: 'Draft not found in your personal review queue.' };
    if (draft.status !== 'pending') return { error: 'This draft has already been reviewed. Create a new draft to revise it.' };
    if (data.decision === 'approve' && hasPlaceholders(data.body)) {
      return { error: 'Replace bracketed placeholders before approving.' };
    }
    const status = data.decision === 'approve' ? 'approved' : data.decision === 'reject' ? 'rejected' : 'pending';
    const payload = writeDraft({ ...draft, subject: data.subject, body: data.body, status,
      ...(status === 'approved' ? { approvedBy: user.id, approvedAt: new Date().toISOString() } : {}) });
    // Optimistic concurrency: a stale tab must not overwrite a newer edit or approval.
    await db.$transaction(async tx => {
      const changed = await tx.task.updateMany({ where: { id: task.id, organizationId: user.organizationId,
        assignedToId: user.id, updatedAt: new Date(data.updatedAt) }, data: {
        description: payload, status: status === 'approved' ? TaskStatus.DONE : status === 'rejected' ? TaskStatus.CANCELLED : TaskStatus.OPEN,
        completedAt: status === 'approved' ? new Date() : null,
      } });
      if (changed.count !== 1) throw new Error('STALE');
      await tx.auditLog.create({ data: { organizationId: user.organizationId, userId: user.id,
        action: `jarvis.draft.${data.decision}`, entityType: 'Task', entityId: task.id,
        metadata: { donorId: task.donorId, delivery: 'manual-only' } } });
    });
    refresh();
    return { success: status === 'approved' ? 'Approved for manual sending. No email was sent.' : status === 'rejected' ? 'Draft rejected.' : 'Draft saved.' };
  } catch { return { error: 'Could not save. Refresh to load the latest draft before trying again.' }; }
}
export async function completeJarvisTask(taskId: string) {
  try {
    const { user, db } = await context();
    const task = await db.task.findFirst({ where: { id: taskId, organizationId: user.organizationId } });
    if (!task || task.description?.startsWith(JARVIS_DRAFT_PREFIX)) return { error: 'Use Approvals to review outreach drafts.' };
    if (task.assignedToId !== user.id && !permissions.canManageUsers(user.role as Role)) return { error: 'Only the assigned owner or an administrator can complete this action.' };
    await db.$transaction(async tx => {
      await tx.task.updateMany({ where: { id: taskId, organizationId: user.organizationId },
        data: { status: TaskStatus.DONE, completedAt: new Date() } });
      await tx.auditLog.create({ data: { organizationId: user.organizationId, userId: user.id,
        action: 'jarvis.task.complete', entityType: 'Task', entityId: taskId } });
    });
    refresh();
    return { success: 'Commitment completed and saved.' };
  } catch { return { error: 'Could not complete the task. Please try again.' }; }
}

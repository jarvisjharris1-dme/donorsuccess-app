import { TaskPriority, TaskStatus, RetentionRisk, CampaignStatus } from '@prisma/client';
import type { ScopedPrisma } from '@/lib/tenant-db';
import { donorDisplayName } from '@/lib/format';

export type DecisionQueueItem = {
  id: string;
  label: string;
  detail: string;
  severity: 'high' | 'medium';
  href: string;
};

const DAY_MS = 24 * 60 * 60 * 1000;
const CAMPAIGN_PACE_THRESHOLD = 0.15;

export async function gatherDecisionQueue(db: ScopedPrisma): Promise<DecisionQueueItem[]> {
  const now = new Date();

  const [overdueHighPriorityTasks, atRiskDonorsWithoutPlan, openGrants, activeCampaigns] = await Promise.all([
    db.task.findMany({
      where: {
        status: { in: [TaskStatus.OPEN, TaskStatus.IN_PROGRESS] },
        priority: TaskPriority.HIGH,
        dueDate: { lt: now },
      },
      orderBy: { dueDate: 'asc' },
      take: 5,
      include: {
        assignedTo: { select: { name: true, email: true } },
        donor: { select: { firstName: true, lastName: true, organizationName: true } },
      },
    }),
    db.donor.findMany({
      where: {
        retentionRisk: { in: [RetentionRisk.HIGH, RetentionRisk.CRITICAL] },
        successPlans: { none: { status: 'ACTIVE' } },
      },
      orderBy: { lifetimeGiving: 'desc' },
      take: 5,
      select: { id: true, firstName: true, lastName: true, organizationName: true, retentionRisk: true },
    }),
    db.grantOpportunity.findMany({
      where: { stage: { in: ['RESEARCHING', 'LOI_SUBMITTED', 'PROPOSAL_SUBMITTED'] } },
      include: {
        donor: { select: { firstName: true, lastName: true, organizationName: true } },
        requirements: { where: { isComplete: false }, orderBy: { dueDate: 'asc' }, take: 1 },
      },
    }),
    db.campaign.findMany({
      where: {
        status: CampaignStatus.ACTIVE,
        goalAmount: { not: null },
        startDate: { not: null },
        endDate: { not: null },
      },
      select: { id: true, name: true, goalAmount: true, raisedAmount: true, startDate: true, endDate: true },
    }),
  ]);

  const items: DecisionQueueItem[] = [];

  for (const t of overdueHighPriorityTasks) {
    const daysOverdue = Math.round((now.getTime() - t.dueDate!.getTime()) / DAY_MS);
    items.push({
      id: `task-${t.id}`,
      label: t.title,
      detail: `${daysOverdue} day${daysOverdue === 1 ? '' : 's'} overdue${t.donor ? ` · ${donorDisplayName(t.donor)}` : ''} · ${t.assignedTo.name ?? t.assignedTo.email}`,
      severity: 'high',
      href: '/tasks',
    });
  }

  for (const d of atRiskDonorsWithoutPlan) {
    items.push({
      id: `donor-${d.id}`,
      label: donorDisplayName(d),
      detail: `${d.retentionRisk === 'CRITICAL' ? 'Critical' : 'High'} risk, no active Success Plan`,
      severity: d.retentionRisk === 'CRITICAL' ? 'high' : 'medium',
      href: `/donors/${d.id}`,
    });
  }

  for (const g of openGrants) {
    const nextReq = g.requirements[0];
    const relevantDate = nextReq?.dueDate ?? g.applicationDeadline ?? g.decisionExpectedDate;
    if (!relevantDate) continue;
    const daysUntil = (relevantDate.getTime() - now.getTime()) / DAY_MS;
    if (daysUntil > 7) continue;
    items.push({
      id: `grant-${g.id}`,
      label: `${donorDisplayName(g.donor)} — ${nextReq ? nextReq.name : g.name}`,
      detail: daysUntil < 0 ? `${Math.abs(Math.round(daysUntil))} days overdue` : `Due in ${Math.max(0, Math.round(daysUntil))} days`,
      severity: daysUntil < 0 ? 'high' : 'medium',
      href: `/grants/${g.id}`,
    });
  }

  for (const c of activeCampaigns) {
    const totalMs = c.endDate!.getTime() - c.startDate!.getTime();
    if (totalMs <= 0) continue;
    const elapsedFraction = Math.min(1, Math.max(0, (now.getTime() - c.startDate!.getTime()) / totalMs));
    const raisedFraction = Number(c.raisedAmount) / Number(c.goalAmount);
    const gap = elapsedFraction - raisedFraction;
    if (gap < CAMPAIGN_PACE_THRESHOLD) continue;
    items.push({
      id: `campaign-${c.id}`,
      label: c.name,
      detail: `${Math.round(raisedFraction * 100)}% of goal raised, ${Math.round(elapsedFraction * 100)}% of timeline elapsed`,
      severity: gap > 0.3 ? 'high' : 'medium',
      href: `/campaigns/${c.id}`,
    });
  }

  return items.sort((a, b) => (a.severity === b.severity ? 0 : a.severity === 'high' ? -1 : 1)).slice(0, 8);
}

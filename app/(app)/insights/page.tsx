import { redirect } from 'next/navigation';
import Link from 'next/link';
import { Role, TaskStatus, CampaignStatus, RetentionRisk } from '@prisma/client';
import { auth } from '@/auth';
import { permissions } from '@/lib/permissions';
import { forOrg } from '@/lib/tenant-db';
import { resolveScope } from '@/lib/scope';
import { donorDisplayName } from '@/lib/format';
import { JARVIS_DRAFT_PREFIX, readDraft } from '@/lib/jarvis';
import ChatInterface from '@/components/insights/ChatInterface';
import OfficerWorkspace from '@/components/jarvis/OfficerWorkspace';

export const dynamic = 'force-dynamic';

export default async function InsightsPage({ searchParams }: { searchParams: { scope?: string; view?: string } }) {
  const session = await auth();
  if (!session?.user) redirect('/login');
  if (!permissions.canEditDonors(session.user.role as Role)) redirect('/dashboard');
  if (searchParams.view === 'chat') return <div>
    <Link href="/insights" className="text-sm font-semibold text-evergreen">← Officer workspace</Link>
    <h1 className="mt-4 text-2xl font-extrabold">Ask Jarvis</h1>
    <p className="mt-1 text-sm text-gray-600">Explore your organization’s data with the existing AI assistant.</p>
    <div className="mt-6"><ChatInterface /></div>
  </div>;
  const user = session.user;
  const db = forOrg(user.organizationId);
  const scope = resolveScope(user.role as Role, searchParams.scope);
  const donorWhere = scope === 'mine' ? { assignedToId: user.id } : {};
  const taskWhere = {
    ...(scope === 'mine' ? { assignedToId: user.id } : {}),
    status: { in: [TaskStatus.OPEN, TaskStatus.IN_PROGRESS] },
    OR: [{ description: null }, { NOT: { description: { startsWith: JARVIS_DRAFT_PREFIX } } }],
  };
  const campaignWhere = { parentCampaignId: null, status: { in: [CampaignStatus.PLANNING, CampaignStatus.ACTIVE] },
    ...(user.role === Role.FUNDRAISER ? { OR: [{ visibleToAll: true }, { assignedFundraisers: { some: { id: user.id } } }] } : {}) };
  const [organization, totalDonors, openTasks, overdueTasks, tasks, donors, campaigns, drafts, riskDonors] = await Promise.all([
    db.organization.findUnique({ where: { id: user.organizationId }, select: { name: true } }),
    db.donor.count({ where: donorWhere }),
    db.task.count({ where: taskWhere }),
    db.task.count({ where: { ...taskWhere, dueDate: { lt: new Date() } } }),
    db.task.findMany({ where: taskWhere, take: 30, orderBy: [{ priority: 'desc' }, { dueDate: { sort: 'asc', nulls: 'last' } }],
      select: { id: true, title: true, dueDate: true, priority: true, assignedToId: true,
        donor: { select: { id: true, firstName: true, lastName: true, organizationName: true } }, assignedTo: { select: { name: true, email: true } } } }),
    db.donor.findMany({ where: donorWhere, take: 12, orderBy: { lifetimeGiving: 'desc' },
      select: { id: true, firstName: true, lastName: true, organizationName: true, lifetimeGiving: true, retentionRisk: true,
        assignedTo: { select: { name: true, email: true } } } }),
    db.campaign.findMany({ where: campaignWhere, take: 8, orderBy: { startDate: { sort: 'asc', nulls: 'last' } },
      select: { id: true, name: true, goalAmount: true, raisedAmount: true, status: true, startDate: true } }),
    db.task.findMany({ where: { assignedToId: user.id, description: { startsWith: JARVIS_DRAFT_PREFIX } },
      take: 50, orderBy: { updatedAt: 'desc' }, select: { id: true, description: true, updatedAt: true,
        donor: { select: { id: true, firstName: true, lastName: true, organizationName: true, email: true } } } }),
    db.donor.findMany({ where: { ...donorWhere, retentionRisk: { in: [RetentionRisk.CRITICAL, RetentionRisk.HIGH] } },
      take: 8, orderBy: { updatedAt: 'desc' }, select: { id: true, firstName: true, lastName: true, organizationName: true, retentionRisk: true } }),
  ]);
  return <OfficerWorkspace data={{
    organizationName: organization?.name || 'Your organization', scope, totalDonors, openTasks, overdueTasks,
    refreshedAt: new Date().toISOString(),
    tasks: tasks.map(t => ({ id: t.id, title: t.title, dueDate: t.dueDate?.toISOString() || null,
      priority: t.priority, owner: t.assignedTo.name || t.assignedTo.email,
      canComplete: t.assignedToId === user.id || permissions.canManageUsers(user.role as Role),
      donorId: t.donor?.id || null, donorName: t.donor ? donorDisplayName(t.donor) : null })),
    donors: donors.map(d => ({ id: d.id, name: donorDisplayName(d), giving: Number(d.lifetimeGiving),
      risk: d.retentionRisk, owner: d.assignedTo?.name || d.assignedTo?.email || 'Unassigned' })),
    risks: riskDonors.map(d => ({ id: d.id, name: donorDisplayName(d), risk: d.retentionRisk || 'HIGH' })),
    campaigns: campaigns.map(c => ({ id: c.id, name: c.name, goal: c.goalAmount === null ? null : Number(c.goalAmount),
      raised: Number(c.raisedAmount), status: c.status, startDate: c.startDate?.toISOString() || null })),
    drafts: drafts.flatMap(t => { const draft = readDraft(t.description); return draft ? [{ ...draft, id: t.id,
      updatedAt: t.updatedAt.toISOString(), donorName: t.donor ? donorDisplayName(t.donor) : 'Removed donor',
      email: t.donor?.email || null, donorId: t.donor?.id || null }] : []; }),
  }} />;
}

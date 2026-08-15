import { Users, DollarSign, GitBranch, Megaphone } from 'lucide-react';
import { auth } from '@/auth';
import { prisma } from '@/lib/db';
import { forOrg } from '@/lib/tenant-db';
import { CampaignStatus, TaskStatus, Role, RetentionRisk, SequenceEnrollmentStatus } from '@prisma/client';
import StatCard from '@/components/dashboard/StatCard';
import RetentionRateCard from '@/components/dashboard/RetentionRateCard';
import RiskOverview, { type RiskCounts } from '@/components/dashboard/RiskOverview';
import UpcomingTasksPanel, { type UpcomingTask } from '@/components/dashboard/UpcomingTasksPanel';
import RecentGiftsPanel, { type RecentGift } from '@/components/dashboard/RecentGiftsPanel';
import MyAttentionPanel, { type AttentionDonor } from '@/components/dashboard/MyAttentionPanel';
import SequenceStepsDuePanel, { type DueSequenceStep } from '@/components/dashboard/SequenceStepsDuePanel';
import GrantDeadlinesPanel, { type GrantDeadlineItem } from '@/components/dashboard/GrantDeadlinesPanel';
import ExecutiveBriefingCard from '@/components/dashboard/ExecutiveBriefingCard';
import DecisionQueuePanel from '@/components/dashboard/DecisionQueuePanel';
import { gatherDecisionQueue } from '@/lib/dashboard/decision-queue';
import QuickActions from '@/components/dashboard/QuickActions';
import ViewScopeToggle from '@/components/shared/ViewScopeToggle';
import { resolveScope } from '@/lib/scope';
import { calculateDonorRetentionRate } from '@/lib/metrics/retention';
import { OPEN_STAGES } from '@/lib/pipeline';
import { donorDisplayName, formatCurrency } from '@/lib/format';

function getGreeting(timezone: string): string {
  const hour = Number(
    new Intl.DateTimeFormat('en-US', { hour: 'numeric', hour12: false, timeZone: timezone }).format(
      new Date(),
    ),
  );
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: { scope?: string };
}) {
  const session = await auth();
  const db = forOrg(session!.user.organizationId);

  // "mine" is the default for Fundraisers (their own book of donors);
  // Owner/Admin/Viewer default to "all" — see lib/scope.ts.
  const scope = resolveScope(session!.user.role as Role, searchParams.scope);
  const isMine = scope === 'mine';
  const myId = session!.user.id;

  const donorWhere = isMine ? { assignedToId: myId } : {};
  const opportunityWhere = isMine
    ? { ownerId: myId, stage: { in: OPEN_STAGES } }
    : { stage: { in: OPEN_STAGES } };
  const campaignWhere = isMine
    ? { status: CampaignStatus.ACTIVE, OR: [{ visibleToAll: true }, { assignedFundraisers: { some: { id: myId } } }] }
    : { status: CampaignStatus.ACTIVE };
  const giftWhere = isMine ? { donor: { assignedToId: myId } } : {};
  // Upcoming tasks stay a personal to-do list regardless of scope — a
  // fundraiser's dashboard showing every other fundraiser's tasks even
  // in "Whole Organization" view would be noise, not oversight. (An
  // org-wide task view belongs on the Tasks page itself, which already
  // has its own scope toggle.)

  const [
    organization,
    donorCount,
    givingAgg,
    pipelineAgg,
    activeCampaignCount,
    riskGroups,
    upcomingTasksRaw,
    recentGiftsRaw,
    retention,
    myAtRiskDonorsRaw,
    myActiveEnrollmentsRaw,
    myOpenGrantsRaw,
    myComplianceMilestonesRaw,
  ] = await Promise.all([
    prisma.organization.findUniqueOrThrow({
      where: { id: session!.user.organizationId },
      select: { name: true, timezone: true },
    }),
    db.donor.count({ where: donorWhere }),
    db.donor.aggregate({ _sum: { lifetimeGiving: true }, where: donorWhere }),
    db.opportunity.aggregate({ _sum: { askAmount: true }, where: opportunityWhere }),
    db.campaign.count({ where: campaignWhere }),
    db.donor.groupBy({ by: ['retentionRisk'], _count: { _all: true }, where: donorWhere }),
    db.task.findMany({
      where: { assignedToId: myId, status: { in: [TaskStatus.OPEN, TaskStatus.IN_PROGRESS] } },
      orderBy: { dueDate: 'asc' },
      take: 5,
      include: { donor: { select: { firstName: true, lastName: true, organizationName: true } } },
    }),
    db.gift.findMany({
      where: giftWhere,
      orderBy: { date: 'desc' },
      take: 5,
      include: { donor: { select: { id: true, firstName: true, lastName: true, organizationName: true } } },
    }),
    calculateDonorRetentionRate(db, isMine ? myId : undefined),
    // Always the viewer's own assigned donors, regardless of scope —
    // same reasoning as Upcoming Tasks above: this is a personal
    // worklist, not an org-wide stat, so the toggle doesn't change it.
    db.donor.findMany({
      where: { assignedToId: myId, retentionRisk: { in: [RetentionRisk.HIGH, RetentionRisk.CRITICAL] } },
      orderBy: [{ retentionRisk: 'asc' }, { lastGiftDate: 'asc' }],
      take: 5,
      select: { id: true, firstName: true, lastName: true, organizationName: true, retentionRisk: true, lastGiftDate: true },
    }),
    // Always personal, same reasoning as myAtRiskDonorsRaw above — this
    // is a work queue, not an org-wide stat.
    db.donorSequenceEnrollment.findMany({
      where: { status: SequenceEnrollmentStatus.ACTIVE, donor: { assignedToId: myId } },
      include: {
        donor: { select: { id: true, firstName: true, lastName: true, organizationName: true } },
        sequenceTemplate: {
          include: {
            steps: { orderBy: { sortOrder: 'asc' }, include: { emailTemplate: { select: { name: true } } } },
          },
        },
      },
    }),
    // Always personal, same reasoning as the other work-queue panels
    // above — this is "what do I need to act on", not an org-wide stat.
    db.grantOpportunity.findMany({
      where: { grantWriterId: myId, stage: { in: ['RESEARCHING', 'LOI_SUBMITTED', 'PROPOSAL_SUBMITTED'] } },
      include: {
        donor: { select: { firstName: true, lastName: true, organizationName: true } },
        requirements: { where: { isComplete: false }, orderBy: { dueDate: 'asc' } },
      },
    }),
    // Compliance owner's own view — a different role from grantWriterId
    // above, and a genuinely different person on real multi-person
    // grants, so this is a separate query rather than reusing the one
    // above with an OR condition.
    db.grantMilestone.findMany({
      where: { isComplete: false, grant: { complianceOwnerId: myId } },
      orderBy: { dueDate: 'asc' },
      include: { grant: { include: { donor: { select: { firstName: true, lastName: true, organizationName: true } } } } },
    }),
  ]);

  // Both are executive-level, org-wide views — deliberately not fetched
  // at all in "mine" scope, since a personal fundraiser view showing
  // an "Executive Briefing" wouldn't make sense, and it avoids the
  // extra queries entirely for the far more common personal-dashboard
  // view.
  const [briefingSnapshot, decisionQueueItems] = isMine
    ? [null, []]
    : await Promise.all([
        prisma.executiveBriefingSnapshot.findUnique({
          where: { organizationId: session!.user.organizationId },
          select: { content: true, generatedAt: true },
        }),
        gatherDecisionQueue(db),
      ]);

  const riskCounts: RiskCounts = { LOW: 0, MEDIUM: 0, HIGH: 0, CRITICAL: 0, UNSCORED: 0 };
  for (const g of riskGroups as { retentionRisk: string | null; _count: { _all: number } }[]) {
    const key = (g.retentionRisk ?? 'UNSCORED') as keyof RiskCounts;
    riskCounts[key] = g._count._all;
  }

  const upcomingTasks: UpcomingTask[] = upcomingTasksRaw.map((t) => ({
    id: t.id,
    title: t.title,
    dueDate: t.dueDate ? t.dueDate.toISOString() : null,
    priority: t.priority,
    donorName: t.donor ? donorDisplayName(t.donor) : null,
  }));

  const recentGifts: RecentGift[] = recentGiftsRaw.map((g) => ({
    id: g.id,
    donorId: g.donor.id,
    donorName: donorDisplayName(g.donor),
    amount: g.amount.toString(),
    date: g.date.toISOString(),
  }));

  const myAtRiskDonors: AttentionDonor[] = myAtRiskDonorsRaw.map((d) => ({
    id: d.id,
    name: donorDisplayName(d),
    retentionRisk: d.retentionRisk!,
    lastGiftDate: d.lastGiftDate ? d.lastGiftDate.toISOString() : null,
  }));

  // Due-ness is computed here rather than in SQL, since each step's due
  // date is startedAt + that step's own dayOffset — not a single stored
  // column to filter on directly.
  const dueSequenceSteps: DueSequenceStep[] = myActiveEnrollmentsRaw
    .map((enrollment) => {
      const currentStep = enrollment.sequenceTemplate.steps.find(
        (s) => s.sortOrder === enrollment.currentStepOrder,
      );
      if (!currentStep) return null;
      const dueDate = new Date(enrollment.startedAt);
      dueDate.setDate(dueDate.getDate() + currentStep.dayOffset);
      if (dueDate.getTime() > Date.now()) return null; // not due yet

      return {
        enrollmentId: enrollment.id,
        donorId: enrollment.donor.id,
        donorName: donorDisplayName(enrollment.donor),
        sequenceName: enrollment.sequenceTemplate.name,
        stepTemplateName: currentStep.emailTemplate.name,
        isOverdue: dueDate.getTime() < Date.now() - 24 * 60 * 60 * 1000,
      };
    })
    .filter((s): s is DueSequenceStep => s !== null);

  // One item per grant, showing whichever date is most urgent — the
  // earliest incomplete requirement due date, or the grant's own
  // application/decision date if it has no requirements tracked.
  // "Overdue" and "due soon" are deliberately different severities
  // (not just different copy) — a missed grant report is a genuinely
  // different category of problem than a donor going quiet.
  const DAY_MS = 24 * 60 * 60 * 1000;
  const preAwardItems = myOpenGrantsRaw
    .map((g) => {
      const nextRequirement = g.requirements[0]; // already filtered incomplete, sorted by dueDate asc
      const relevantDate = nextRequirement?.dueDate ?? g.applicationDeadline ?? g.decisionExpectedDate;
      if (!relevantDate) return null;

      const daysUntil = (relevantDate.getTime() - Date.now()) / DAY_MS;
      const severity: GrantDeadlineItem['severity'] =
        daysUntil < 0 ? 'overdue' : daysUntil <= 7 ? 'soon' : 'normal';

      const label = `${donorDisplayName(g.donor)} — ${nextRequirement ? nextRequirement.name : g.name}`;
      const dateLabel = relevantDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      const detail =
        daysUntil < 0
          ? `${Math.abs(Math.round(daysUntil))} days overdue`
          : daysUntil <= 7
            ? `Due in ${Math.max(0, Math.round(daysUntil))} days · ${dateLabel}`
            : `Due ${dateLabel}`;

      return { grantId: g.id, label, detail, severity, sortDate: relevantDate.getTime() };
    })
    .filter((item): item is GrantDeadlineItem & { sortDate: number } => item !== null);

  // Compliance milestones — a genuinely different person's queue on
  // real multi-person grants, merged into the same list since both are
  // "grant deadlines I need to act on," just from different roles.
  const postAwardItems = myComplianceMilestonesRaw.map((m) => {
    const daysUntil = (m.dueDate.getTime() - Date.now()) / DAY_MS;
    const severity: GrantDeadlineItem['severity'] =
      daysUntil < 0 ? 'overdue' : daysUntil <= 7 ? 'soon' : 'normal';
    const label = `${donorDisplayName(m.grant.donor)} — ${m.name}`;
    const dateLabel = m.dueDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    const detail =
      daysUntil < 0
        ? `${Math.abs(Math.round(daysUntil))} days overdue`
        : daysUntil <= 7
          ? `Due in ${Math.max(0, Math.round(daysUntil))} days · ${dateLabel}`
          : `Due ${dateLabel}`;
    return {
      grantId: m.grant.grantOpportunityId,
      label,
      detail,
      severity,
      sortDate: m.dueDate.getTime(),
    };
  });

  const grantDeadlineItems: GrantDeadlineItem[] = [...preAwardItems, ...postAwardItems]
    .sort((a, b) => a.sortDate - b.sortDate)
    .slice(0, 5);

  const greeting = getGreeting(organization.timezone);
  const today = new Intl.DateTimeFormat('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    timeZone: organization.timezone,
  }).format(new Date());

  return (
    <div className="max-w-6xl">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="text-[13px] font-semibold text-gray-600">{today}</p>
          <h1 className="mt-1 font-display text-[28px] font-extrabold text-gray-900 sm:text-[32px]">
            {greeting}
            {session?.user.name ? `, ${session.user.name.split(' ')[0]}` : ''}
          </h1>
          <p className="mt-1 text-[15px] text-gray-600">
            {isMine ? 'Your donors and pipeline' : organization.name}
          </p>
        </div>
        <QuickActions />
      </div>

      <div className="mt-5">
        <ViewScopeToggle activeScope={scope} />
      </div>

      {!isMine && briefingSnapshot?.content && (
        <div className="mt-6">
          <ExecutiveBriefingCard
            content={briefingSnapshot.content}
            generatedAt={briefingSnapshot.generatedAt.toISOString()}
          />
        </div>
      )}

      <div className="mt-6">
        <RetentionRateCard
          rate={retention.rate}
          priorPeriodDonors={retention.priorPeriodDonors}
          retainedDonors={retention.retainedDonors}
        />
      </div>

      <div className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard
          icon={Users}
          label={isMine ? 'Your donors' : 'Total donors'}
          value={String(donorCount)}
          accent="evergreen"
          delay={0}
        />
        <StatCard
          icon={DollarSign}
          label="Lifetime raised"
          value={formatCurrency(givingAgg._sum.lifetimeGiving?.toString() ?? '0')}
          accent="success"
          delay={60}
        />
        <StatCard
          icon={GitBranch}
          label={isMine ? 'Your open pipeline' : 'Open pipeline'}
          value={formatCurrency(pipelineAgg._sum.askAmount?.toString() ?? '0')}
          accent="sky"
          delay={120}
        />
        <StatCard
          icon={Megaphone}
          label="Active campaigns"
          value={String(activeCampaignCount)}
          accent="warning"
          delay={180}
        />
      </div>

      <div className="mt-6">
        <RiskOverview counts={riskCounts} />
      </div>

      {!isMine && decisionQueueItems.length > 0 && (
        <div className="mt-6">
          <DecisionQueuePanel items={decisionQueueItems} />
        </div>
      )}

      <div className="mt-6">
        <MyAttentionPanel donors={myAtRiskDonors} />
      </div>

      <div className="mt-6">
        <SequenceStepsDuePanel steps={dueSequenceSteps} />
      </div>

      <div className="mt-6">
        <GrantDeadlinesPanel items={grantDeadlineItems} />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <UpcomingTasksPanel tasks={upcomingTasks} />
        <RecentGiftsPanel gifts={recentGifts} />
      </div>
    </div>
  );
}

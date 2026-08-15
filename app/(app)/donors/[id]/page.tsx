import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Mail, Phone, MapPin, Pencil } from 'lucide-react';
import { auth } from '@/auth';
import { prisma } from '@/lib/db';
import { forOrg } from '@/lib/tenant-db';
import { getEmailConnection } from '@/lib/integrations/email-send';
import SendEmailPanel, { type EmailTemplateOption } from '@/components/donors/SendEmailPanel';
import { permissions } from '@/lib/permissions';
import {
  Role,
  TaskStatus,
  CampaignStatus,
  PlanStatus,
  MilestoneStatus,
  SequenceEnrollmentStatus,
} from '@prisma/client';
import DonorAvatar from '@/components/donors/DonorAvatar';
import { HealthScoreBadge, RetentionRiskBadge } from '@/components/donors/Badges';
import SegmentBadge from '@/components/donors/SegmentBadge';
import DeleteDonorButton from '@/components/donors/DeleteDonorButton';
import RecalculateScoreButton from '@/components/donors/RecalculateScoreButton';
import GiftsPanel, { type GiftRow } from '@/components/donors/GiftsPanel';
import InteractionsPanel, { type InteractionRow } from '@/components/donors/InteractionsPanel';
import OpportunitiesPanel, { type OpportunityRow } from '@/components/donors/OpportunitiesPanel';
import ExecutiveSummaryCard from '@/components/donors/ExecutiveSummaryCard';
import NextBestActionsPanel from '@/components/donors/NextBestActionsPanel';
import RelatedTasksPanel from '@/components/tasks/RelatedTasksPanel';
import { type TaskRowData } from '@/components/tasks/TaskRow';
import SuccessPlanSummaryCard, { type PlanSummary } from '@/components/plans/SuccessPlanSummaryCard';
import DonorContactsPanel from '@/components/donors/DonorContactsPanel';
import DonorAffiliationsPanel from '@/components/donors/DonorAffiliationsPanel';
import RelationshipGraphPanel, { type RelationshipGraphData } from '@/components/donors/RelationshipGraphPanel';
import VolunteerHoursPanel, { type VolunteerHoursRow } from '@/components/donors/VolunteerHoursPanel';
import WealthInsightsPanel from '@/components/donors/WealthInsightsPanel';
import SuccessSequencePanel, {
  type ActiveEnrollmentView,
  type SuggestedSequence,
} from '@/components/donors/SuccessSequencePanel';
import { isOrgType } from '@/lib/donor-types';
import { getNextBestActions } from '@/lib/insights/next-best-actions';
import { donorDisplayName, formatCurrency } from '@/lib/format';
import { OPEN_STAGES } from '@/lib/pipeline';
import DetailTabs, { type DetailTab } from '@/components/ui/DetailTabs';

export default async function DonorDetailPage({ params }: { params: { id: string } }) {
  const session = await auth();
  const db = forOrg(session!.user.organizationId);

  const [donor, users, campaigns, activePlan, organization, emailTemplatesRaw, emailConnection, otherDonors, wealthEngineConnection] =
    await Promise.all([
      db.donor.findUnique({
        where: { id: params.id },
        include: {
          assignedTo: { select: { name: true, email: true } },
          gifts: {
            orderBy: { date: 'desc' },
            take: 20,
            include: { campaign: { select: { name: true } } },
          },
          interactions: {
            orderBy: { occurredAt: 'desc' },
            take: 20,
            include: { loggedBy: { select: { name: true, email: true } } },
          },
          opportunities: { orderBy: { createdAt: 'desc' } },
          tasks: {
            where: { status: { not: TaskStatus.DONE } },
            orderBy: { dueDate: 'asc' },
            include: { assignedTo: { select: { name: true, email: true } } },
          },
          contacts: { orderBy: [{ isPrimary: 'desc' }, { lastName: 'asc' }] },
          affiliations: {
            orderBy: { createdAt: 'desc' },
            include: {
              affiliatedDonor: {
                select: { id: true, firstName: true, lastName: true, organizationName: true },
              },
            },
          },
        },
      }),
      db.user.findMany({
        where: { isActive: true },
        select: { id: true, name: true, email: true },
        orderBy: { name: 'asc' },
      }),
      db.campaign.findMany({
        where: { status: { in: [CampaignStatus.PLANNING, CampaignStatus.ACTIVE] } },
        select: { id: true, name: true },
        orderBy: { name: 'asc' },
      }),
      db.donorSuccessPlan.findFirst({
        where: { donorId: params.id, status: PlanStatus.ACTIVE },
        orderBy: { updatedAt: 'desc' },
        include: { milestones: { select: { status: true, title: true, dueDate: true } } },
      }),
      prisma.organization.findUniqueOrThrow({
        where: { id: session!.user.organizationId },
        select: { name: true },
      }),
      db.emailTemplate.findMany({
        select: { id: true, name: true, subject: true, body: true, suggestedForRisk: true },
      }),
      getEmailConnection(session!.user.id),
      db.donor.findMany({
        where: { id: { not: params.id } },
        select: { id: true, firstName: true, lastName: true, organizationName: true },
        orderBy: { organizationName: 'asc' },
        take: 500,
      }),
      db.wealthEngineConnection.findFirst({ select: { id: true } }),
    ]);

  if (!donor) notFound();

  // Relationship graph data — kept as its own parallel fetch rather than
  // folded into the query above, since it needs board terms this donor
  // holds AND introductions that reference this donor from either side
  // (as the introducer's own prospect, or as the board member who made
  // the introduction) — none of which the main donor query above needs
  // for anything else on this page.
  const [donorBoardTerms, introductionsReceived, volunteerHoursRaw] = await Promise.all([
    db.boardTerm.findMany({
      where: { donorId: donor.id },
      select: { id: true, role: true, isActive: true, board: { select: { name: true } } },
    }),
    db.boardIntroduction.findMany({
      where: { prospectDonorId: donor.id },
      select: {
        boardTermId: true,
        status: true,
        boardTerm: { select: { donor: { select: { firstName: true, lastName: true, organizationName: true } } } },
      },
    }),
    db.volunteerHours.findMany({
      where: { donorId: donor.id },
      orderBy: { date: 'desc' },
      select: { id: true, date: true, hours: true, activity: true, dollarValue: true },
    }),
  ]);

  const volunteerHoursRows: VolunteerHoursRow[] = volunteerHoursRaw.map((v) => ({
    id: v.id,
    date: v.date.toISOString(),
    hours: v.hours.toString(),
    activity: v.activity,
    dollarValue: v.dollarValue.toString(),
  }));

  const introductionsMade = donorBoardTerms.length
    ? await db.boardIntroduction.findMany({
        where: { boardTermId: { in: donorBoardTerms.map((t) => t.id) } },
        select: {
          id: true,
          status: true,
          prospectDonor: { select: { id: true, firstName: true, lastName: true, organizationName: true } },
        },
      })
    : [];

  const canEdit = permissions.canEditDonors(session!.user.role as Role);
  const canDelete = permissions.canDeleteRecords(session!.user.role as Role);
  const canScreen = permissions.canManageOrgSettings(session!.user.role as Role);
  const name = donorDisplayName(donor);

  const [activeEnrollmentRaw, suggestedTemplatesRaw, allTemplatesRaw] = await Promise.all([
    db.donorSequenceEnrollment.findFirst({
      where: { donorId: donor.id, status: SequenceEnrollmentStatus.ACTIVE },
      include: {
        sequenceTemplate: { include: { steps: { orderBy: { sortOrder: 'asc' }, include: { emailTemplate: { select: { name: true } } } } } },
        stepLogs: true,
      },
    }),
    donor.retentionRisk
      ? db.sequenceTemplate.findMany({
          where: { suggestedForRisk: donor.retentionRisk },
          include: { _count: { select: { steps: true } } },
        })
      : Promise.resolve([]),
    db.sequenceTemplate.findMany({
      include: { _count: { select: { steps: true } } },
      orderBy: { name: 'asc' },
    }),
  ]);

  const activeEnrollment: ActiveEnrollmentView | null = activeEnrollmentRaw
    ? {
        id: activeEnrollmentRaw.id,
        templateName: activeEnrollmentRaw.sequenceTemplate.name,
        startedAt: activeEnrollmentRaw.startedAt.toISOString(),
        currentStepOrder: activeEnrollmentRaw.currentStepOrder,
        steps: activeEnrollmentRaw.sequenceTemplate.steps.map((s) => {
          const log = activeEnrollmentRaw.stepLogs.find((l) => l.stepOrder === s.sortOrder);
          return {
            sortOrder: s.sortOrder,
            templateName: s.emailTemplate.name,
            dayOffset: s.dayOffset,
            sentAt: log ? log.sentAt.toISOString() : null,
          };
        }),
      }
    : null;

  const suggestedSequences: SuggestedSequence[] = suggestedTemplatesRaw.map((t) => ({
    id: t.id,
    name: t.name,
    description: t.description,
    stepCount: t._count.steps,
  }));

  const allSequences: SuggestedSequence[] = allTemplatesRaw.map((t) => ({
    id: t.id,
    name: t.name,
    description: t.description,
    stepCount: t._count.steps,
  }));

  const giftRows: GiftRow[] = donor.gifts.map((g) => ({
    id: g.id,
    amount: g.amount.toString(),
    date: g.date.toISOString(),
    giftType: g.giftType,
    paymentMethod: g.paymentMethod,
    fund: g.fund,
    campaignName: g.campaign?.name ?? null,
  }));

  const interactionRows: InteractionRow[] = donor.interactions.map((i) => ({
    id: i.id,
    type: i.type,
    subject: i.subject,
    notes: i.notes,
    occurredAt: i.occurredAt.toISOString(),
    loggedByName: i.loggedBy.name ?? i.loggedBy.email,
  }));

  const opportunityRows: OpportunityRow[] = donor.opportunities.map((o) => ({
    id: o.id,
    name: o.name,
    stage: o.stage,
    askAmount: o.askAmount ? o.askAmount.toString() : null,
  }));

  const taskRows: TaskRowData[] = donor.tasks.map((t) => ({
    id: t.id,
    title: t.title,
    status: t.status,
    priority: t.priority,
    dueDate: t.dueDate ? t.dueDate.toISOString() : null,
    assigneeName: t.assignedTo.name ?? t.assignedTo.email,
  }));

  const planSummary: PlanSummary | null = activePlan
    ? {
        id: activePlan.id,
        title: activePlan.title,
        stage: activePlan.stage,
        status: activePlan.status,
        objective: activePlan.objective,
        targetAskAmount: activePlan.targetAskAmount ? activePlan.targetAskAmount.toString() : null,
        targetGiftDate: activePlan.targetGiftDate ? activePlan.targetGiftDate.toISOString() : null,
        milestoneTotal: activePlan.milestones.length,
        milestoneDone: activePlan.milestones.filter((m) => m.status === MilestoneStatus.DONE).length,
      }
    : null;

  const now = new Date();
  const nextBestActions = getNextBestActions({
    retentionRisk: donor.retentionRisk,
    lastGiftDate: donor.lastGiftDate,
    lastInteractionDate: donor.interactions[0]?.occurredAt ?? null,
    overdueTaskCount: donor.tasks.filter((t) => t.dueDate && t.dueDate < now).length,
    openOpportunities: donor.opportunities
      .filter((o) => OPEN_STAGES.includes(o.stage))
      .map((o) => ({ name: o.name, expectedCloseDate: o.expectedCloseDate })),
    activePlanMilestones: activePlan?.milestones ?? [],
  });

  const address = [donor.addressLine1, donor.city, donor.state, donor.postalCode]
    .filter(Boolean)
    .join(', ');

  // Suggested-for-this-donor's-risk templates first, rest after —
  // "suggested" is a nudge, not a restriction, so every template stays
  // available either way.
  const emailTemplates: EmailTemplateOption[] = emailTemplatesRaw
    .map((t) => ({
      id: t.id,
      name: t.name,
      subject: t.subject,
      body: t.body,
      suggested: donor.retentionRisk !== null && t.suggestedForRisk === donor.retentionRisk,
    }))
    .sort((a, b) => Number(b.suggested) - Number(a.suggested));

  const emailMergeContext = {
    firstName: donor.firstName,
    lastName: donor.lastName,
    donorName: name,
    organizationName: organization.name,
    fundraiserName: session!.user.name ?? session!.user.email ?? 'Your fundraising team',
  };

  const affiliationRows = donor.affiliations.map((a) => ({
    id: a.id,
    affiliateName: a.affiliateName,
    affiliationType: a.affiliationType,
    roleTitle: a.roleTitle,
    notes: a.notes,
    affiliatedDonorId: a.affiliatedDonorId,
    affiliatedDonorName: a.affiliatedDonor ? donorDisplayName(a.affiliatedDonor) : null,
  }));

  const donorOptions = otherDonors.map((d) => ({ id: d.id, name: donorDisplayName(d) }));

  return (
    <div className="max-w-5xl">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-4">
          <DonorAvatar name={name} size={56} />
          <div>
            <h1 className="text-2xl font-extrabold text-gray-900">{name}</h1>
            <div className="mt-1.5 flex flex-wrap items-center gap-3 text-sm text-gray-600">
              {donor.email && (
                <span className="flex items-center gap-1.5">
                  <Mail size={14} /> {donor.email}
                </span>
              )}
              {donor.phone && (
                <span className="flex items-center gap-1.5">
                  <Phone size={14} /> {donor.phone}
                </span>
              )}
              {address && (
                <span className="flex items-center gap-1.5">
                  <MapPin size={14} /> {address}
                </span>
              )}
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-2.5">
              <HealthScoreBadge score={donor.healthScore} />
              <RetentionRiskBadge risk={donor.retentionRisk} />
              {donor.segment && <SegmentBadge segment={donor.segment} />}
              <RecalculateScoreButton donorId={donor.id} />
            </div>
          </div>
        </div>

        {canEdit && (
          <div className="flex flex-shrink-0 items-center gap-2.5">
            <Link
              href={`/donors/${donor.id}/edit`}
              className="flex items-center gap-1.5 rounded-xl border border-gray-200 px-4 py-2.5 text-[13.5px] font-semibold text-gray-900 transition-colors hover:border-gray-300"
            >
              <Pencil size={15} />
              Edit
            </Link>
            {canDelete && <DeleteDonorButton donorId={donor.id} />}
          </div>
        )}
      </div>

      {donor.email && (
        <div className="mt-4">
          <SendEmailPanel
            donorId={donor.id}
            donorEmail={donor.email}
            mergeContext={emailMergeContext}
            templates={emailTemplates}
            hasEmailConnection={!!emailConnection}
          />
        </div>
      )}

      <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Stat label="Lifetime giving" value={formatCurrency(donor.lifetimeGiving.toString())} />
        <Stat label="Gifts" value={String(donor.giftCount)} />
        <Stat
          label="Largest gift"
          value={donor.largestGift ? formatCurrency(donor.largestGift.toString()) : '—'}
        />
        <Stat label="Assigned to" value={donor.assignedTo?.name ?? donor.assignedTo?.email ?? 'Unassigned'} />
      </div>

      {(() => {
        const overviewTab = (
          <div className="flex flex-col gap-6">
            <div className="grid gap-6 lg:grid-cols-2">
              <ExecutiveSummaryCard donorId={donor.id} summary={donor.executiveSummary} canEdit={canEdit} />
              <NextBestActionsPanel actions={nextBestActions} />
            </div>
            <WealthInsightsPanel
              donorId={donor.id}
              wealth={{
                wealthEstimatedNetWorth: donor.wealthEstimatedNetWorth?.toString() ?? null,
                wealthEstimatedIncome: donor.wealthEstimatedIncome?.toString() ?? null,
                wealthRealEstateValue: donor.wealthRealEstateValue?.toString() ?? null,
                wealthGivingCapacity: donor.wealthGivingCapacity?.toString() ?? null,
                wealthP2gScore: donor.wealthP2gScore,
                wealthScreenedAt: donor.wealthScreenedAt ? donor.wealthScreenedAt.toISOString() : null,
              }}
              isConnected={!!wealthEngineConnection}
              canScreen={canScreen}
            />
            <SuccessSequencePanel
              donorId={donor.id}
              activeEnrollment={activeEnrollment}
              suggestedSequences={suggestedSequences}
              allSequences={allSequences}
              canManage={canEdit}
            />
            <SuccessPlanSummaryCard donorId={donor.id} plan={planSummary} canCreate={canEdit} />
          </div>
        );

        const relationshipGraphData: RelationshipGraphData = {
          assignedToName: donor.assignedTo?.name ?? donor.assignedTo?.email ?? null,
          boardTerms: donorBoardTerms.map((t) => ({
            id: t.id,
            boardName: t.board.name,
            role: t.role,
            isActive: t.isActive,
          })),
          introducedBy: introductionsReceived.map((intro) => ({
            boardTermId: intro.boardTermId,
            introducerName: donorDisplayName(intro.boardTerm.donor),
            status: intro.status,
          })),
          introductionsMade: introductionsMade.map((intro) => ({
            id: intro.id,
            prospectId: intro.prospectDonor.id,
            prospectName: donorDisplayName(intro.prospectDonor),
            status: intro.status,
          })),
        };

        const relationshipsTab = (
          <div className="flex flex-col gap-6">
            <RelationshipGraphPanel data={relationshipGraphData} />
            <VolunteerHoursPanel
              donorId={donor.id}
              entries={volunteerHoursRows}
              canEdit={canEdit}
              canDelete={permissions.canDeleteRecords(session!.user.role as Role)}
            />
            <DonorAffiliationsPanel
              donorId={donor.id}
              affiliations={affiliationRows}
              donorOptions={donorOptions}
              canEdit={canEdit}
            />
          </div>
        );

        const contactsTab = (
          <DonorContactsPanel donorId={donor.id} contacts={donor.contacts} canEdit={canEdit} />
        );

        const giftsTab = (
          <div className="grid gap-6 lg:grid-cols-2">
            <GiftsPanel donorId={donor.id} gifts={giftRows} campaigns={campaigns} />
            <OpportunitiesPanel donorId={donor.id} opportunities={opportunityRows} users={users} />
          </div>
        );

        const activityTab = (
          <div className="grid gap-6 lg:grid-cols-2">
            <InteractionsPanel donorId={donor.id} interactions={interactionRows} />
            <RelatedTasksPanel
              donorId={donor.id}
              tasks={taskRows}
              users={users}
              currentUserId={session!.user.id}
              canDelete={canEdit}
            />
          </div>
        );

        const tabs: DetailTab[] = [
          { key: 'overview', label: 'Overview', content: overviewTab },
          { key: 'relationships', label: 'Relationships', content: relationshipsTab },
          ...(isOrgType(donor.donorType)
            ? [{ key: 'contacts', label: 'Contacts', count: donor.contacts.length, content: contactsTab }]
            : []),
          { key: 'gifts', label: 'Gifts & Pipeline', count: giftRows.length, content: giftsTab },
          { key: 'activity', label: 'Activity', count: taskRows.length, content: activityTab },
        ];

        return (
          <div className="mt-6">
            <DetailTabs tabs={tabs} />
          </div>
        );
      })()}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[14px] border border-gray-200 bg-white p-4">
      <div className="text-[11px] font-semibold uppercase tracking-wide text-gray-600">{label}</div>
      <div className="mt-1 truncate text-lg font-extrabold text-gray-900">{value}</div>
    </div>
  );
}

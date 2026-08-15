import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { auth } from '@/auth';
import { forOrg } from '@/lib/tenant-db';
import { permissions } from '@/lib/permissions';
import { hasGrantCapability } from '@/lib/grant-permissions';
import { Role, GrantRole } from '@prisma/client';
import { donorDisplayName, formatCurrency, formatDate } from '@/lib/format';
import GrantStageSelector from '@/components/grants/GrantStageSelector';
import GrantRequirementsChecklist, {
  type RequirementRow,
} from '@/components/grants/GrantRequirementsChecklist';
import GrantMilestonesChecklist, {
  type MilestoneRow,
} from '@/components/grants/GrantMilestonesChecklist';
import ConvertToGrantForm from '@/components/grants/ConvertToGrantForm';
import GrantDisbursementsPanel, { type DisbursementRow } from '@/components/grants/GrantDisbursementsPanel';
import GrantDocumentsPanel, { type DocumentRow } from '@/components/grants/GrantDocumentsPanel';
import GrantBudgetPanel, { type BudgetLineRow } from '@/components/grants/GrantBudgetPanel';
import GrantCommentsPanel, { type CommentRow } from '@/components/grants/GrantCommentsPanel';
import RelatedTasksPanel from '@/components/tasks/RelatedTasksPanel';
import { type TaskRowData } from '@/components/tasks/TaskRow';
import DeleteGrantButton from '@/components/grants/DeleteGrantButton';
import DetailTabs, { type DetailTab } from '@/components/ui/DetailTabs';

export default async function GrantDetailPage({ params }: { params: { id: string } }) {
  const session = await auth();
  const db = forOrg(session!.user.organizationId);
  const grantRole = session!.user.grantRole as GrantRole | null;
  const baseRole = session!.user.role as Role;
  const canManageOpportunities = hasGrantCapability(baseRole, grantRole, 'MANAGE_OPPORTUNITIES');
  const canManageCompliance = hasGrantCapability(baseRole, grantRole, 'MANAGE_COMPLIANCE');
  const canManageFinancials = hasGrantCapability(baseRole, grantRole, 'MANAGE_FINANCIALS');
  const canManageDocuments = hasGrantCapability(baseRole, grantRole, 'MANAGE_DOCUMENTS');
  const canComment = hasGrantCapability(baseRole, grantRole, 'COMMENT');
  const canDeleteGrant = hasGrantCapability(baseRole, grantRole, 'DELETE_GRANTS');
  // Tasks aren't a grants-specific object — they're shared across
  // donors, opportunities, and grants — so task deletion stays on the
  // app's general permission system rather than the grants capability
  // matrix, even inside a grant's Tasks tab.
  const canDeleteTasks = permissions.canDeleteRecords(baseRole);

  const [opportunity, users] = await Promise.all([
    db.grantOpportunity.findUnique({
      where: { id: params.id },
      include: {
        donor: { select: { id: true, firstName: true, lastName: true, organizationName: true } },
        grantWriter: { select: { name: true, email: true } },
        requirements: { orderBy: { sortOrder: 'asc' } },
        grant: {
          include: {
            complianceOwner: { select: { name: true, email: true } },
            milestones: { orderBy: { sortOrder: 'asc' } },
            gifts: { orderBy: { date: 'desc' } },
            budgetLines: {
              orderBy: { sortOrder: 'asc' },
              include: { expenses: { orderBy: { date: 'desc' } } },
            },
          },
        },
        documents: {
          orderBy: { createdAt: 'desc' },
          include: {
            uploadedBy: { select: { name: true, email: true } },
            requirement: { select: { name: true } },
            milestone: { select: { name: true } },
          },
        },
        comments: {
          orderBy: { createdAt: 'asc' },
          include: { author: { select: { name: true, email: true } } },
        },
        tasks: {
          where: { status: { not: 'DONE' } },
          orderBy: { dueDate: 'asc' },
          include: { assignedTo: { select: { name: true, email: true } } },
        },
      },
    }),
    db.user.findMany({
      where: { isActive: true },
      select: { id: true, name: true, email: true },
      orderBy: { name: 'asc' },
    }),
  ]);
  if (!opportunity) notFound();

  const requirementRows: RequirementRow[] = opportunity.requirements.map((r) => ({
    id: r.id,
    name: r.name,
    dueDate: r.dueDate ? r.dueDate.toISOString() : null,
    isComplete: r.isComplete,
  }));

  const trackedGrant = opportunity.grant;
  const milestoneRows: MilestoneRow[] = trackedGrant
    ? trackedGrant.milestones.map((m) => ({
        id: m.id,
        name: m.name,
        dueDate: m.dueDate.toISOString(),
        isComplete: m.isComplete,
        completedAt: m.completedAt ? m.completedAt.toISOString() : null,
      }))
    : [];

  const disbursementRows: DisbursementRow[] = trackedGrant
    ? trackedGrant.gifts.map((g) => ({
        id: g.id,
        amount: g.amount.toString(),
        date: g.date.toISOString(),
        notes: g.notes,
      }))
    : [];

  const documentRows: DocumentRow[] = opportunity.documents.map((d) => ({
    id: d.id,
    fileName: d.fileName,
    fileSize: d.fileSize,
    uploadedAt: d.createdAt.toISOString(),
    uploadedByName: d.uploadedBy.name ?? d.uploadedBy.email,
    attachedToLabel: d.requirement?.name ?? d.milestone?.name ?? null,
  }));

  const attachOptions = [
    ...opportunity.requirements.map((r) => ({ value: `requirement:${r.id}`, label: `Requirement: ${r.name}` })),
    ...(trackedGrant?.milestones.map((m) => ({ value: `milestone:${m.id}`, label: `Milestone: ${m.name}` })) ?? []),
  ];

  const budgetLineRows: BudgetLineRow[] = trackedGrant
    ? trackedGrant.budgetLines.map((l) => ({
        id: l.id,
        name: l.name,
        budgetedAmount: Number(l.budgetedAmount),
        expenses: l.expenses.map((e) => ({
          id: e.id,
          amount: Number(e.amount),
          date: e.date.toISOString(),
          description: e.description,
        })),
      }))
    : [];

  const commentRows: CommentRow[] = opportunity.comments.map((c) => ({
    id: c.id,
    content: c.content,
    isSystemGenerated: c.isSystemGenerated,
    authorName: c.author?.name ?? c.author?.email ?? null,
    createdAt: c.createdAt.toISOString(),
    isOwn: c.authorId === session!.user.id,
  }));

  const isAdmin = permissions.canManageOrgSettings(session!.user.role as Role);

  const taskRows: TaskRowData[] = opportunity.tasks.map((t) => ({
    id: t.id,
    title: t.title,
    status: t.status,
    priority: t.priority,
    dueDate: t.dueDate ? t.dueDate.toISOString() : null,
    assigneeName: t.assignedTo.name ?? t.assignedTo.email,
  }));

  return (
    <div className="max-w-3xl">
      <div className="flex items-center justify-between">
        <Link
          href="/grants"
          className="flex items-center gap-1.5 text-[13px] font-semibold text-gray-600 hover:text-gray-900"
        >
          <ArrowLeft size={14} />
          Grant opportunities
        </Link>
        {canDeleteGrant && <DeleteGrantButton id={opportunity.id} />}
      </div>

      <div className="mt-3 flex items-start justify-between">
        <div>
          <Link
            href={`/donors/${opportunity.donor.id}`}
            className="text-[13px] font-semibold text-evergreen hover:text-[#0d685f]"
          >
            {donorDisplayName(opportunity.donor)}
          </Link>
          <h1 className="mt-1 text-2xl font-extrabold text-gray-900">{opportunity.name}</h1>
          {opportunity.programName && (
            <p className="mt-0.5 text-sm text-gray-600">{opportunity.programName}</p>
          )}
        </div>
        <span className="flex-shrink-0 text-[22px] font-bold text-gray-900">
          {formatCurrency(opportunity.askAmount.toString())}
        </span>
      </div>

      <div className="mt-4 flex items-center gap-3">
        <GrantStageSelector grantId={opportunity.id} currentStage={opportunity.stage} canEdit={canManageOpportunities} />
        {opportunity.stage === 'DECLINED' && opportunity.declineReason && (
          <span className="text-sm text-gray-600">— {opportunity.declineReason}</span>
        )}
      </div>

      <div className="mt-6 grid grid-cols-2 gap-4">
        <div className="rounded-[16px] border border-gray-200 bg-white p-4">
          <p className="text-[12px] text-gray-500">Grant writer</p>
          <p className="mt-1 text-sm font-semibold text-gray-900">
            {opportunity.grantWriter.name ?? opportunity.grantWriter.email}
          </p>
        </div>
        <div className="rounded-[16px] border border-gray-200 bg-white p-4">
          <p className="text-[12px] text-gray-500">
            {opportunity.applicationDeadline ? 'Application deadline' : 'Decision expected'}
          </p>
          <p className="mt-1 text-sm font-semibold text-gray-900">
            {opportunity.applicationDeadline
              ? formatDate(opportunity.applicationDeadline.toISOString())
              : opportunity.decisionExpectedDate
                ? formatDate(opportunity.decisionExpectedDate.toISOString())
                : '—'}
          </p>
        </div>
      </div>

      {(() => {
        const overviewTab = (
          <div className="flex flex-col gap-6">
            <GrantRequirementsChecklist
              grantOpportunityId={opportunity.id}
              requirements={requirementRows}
              canEdit={canManageOpportunities}
            />

            {opportunity.stage === 'AWARDED' && !trackedGrant && canManageOpportunities && (
              <ConvertToGrantForm grantOpportunityId={opportunity.id} users={users} />
            )}

            {trackedGrant && (
              <div className="grid grid-cols-2 gap-4">
                <div className="rounded-[16px] border border-gray-200 bg-white p-4">
                  <p className="text-[12px] text-gray-500">Compliance owner</p>
                  <p className="mt-1 text-sm font-semibold text-gray-900">
                    {trackedGrant.complianceOwner.name ?? trackedGrant.complianceOwner.email}
                  </p>
                </div>
                <div className="rounded-[16px] border border-gray-200 bg-white p-4">
                  <p className="text-[12px] text-gray-500">Grant period</p>
                  <p className="mt-1 text-sm font-semibold text-gray-900">
                    {formatDate(trackedGrant.periodStart.toISOString())}
                    {trackedGrant.periodEnd ? ` – ${formatDate(trackedGrant.periodEnd.toISOString())}` : ''}
                  </p>
                </div>
              </div>
            )}

            {trackedGrant?.restrictedUseNotes && (
              <div className="rounded-[16px] border border-gray-200 bg-white p-4">
                <p className="text-[12px] text-gray-500">Restricted use</p>
                <p className="mt-1 text-sm text-gray-700">{trackedGrant.restrictedUseNotes}</p>
              </div>
            )}

            {opportunity.notes && (
              <div className="rounded-[16px] border border-gray-200 bg-white p-6">
                <h2 className="text-[15px] font-bold text-gray-900">Notes</h2>
                <p className="mt-2 whitespace-pre-wrap text-sm text-gray-700">{opportunity.notes}</p>
              </div>
            )}
          </div>
        );

        const complianceTab = trackedGrant ? (
          <GrantMilestonesChecklist
            grantId={trackedGrant.id}
            grantOpportunityId={opportunity.id}
            milestones={milestoneRows}
            canEdit={canManageCompliance}
          />
        ) : (
          <div className="rounded-[16px] border border-dashed border-gray-200 p-8 text-center text-sm text-gray-600">
            This grant hasn&rsquo;t been awarded and converted yet — a compliance plan starts once it is.
          </div>
        );

        const financialsTab = trackedGrant ? (
          <div className="flex flex-col gap-6">
            <GrantDisbursementsPanel
              grantId={trackedGrant.id}
              grantOpportunityId={opportunity.id}
              disbursements={disbursementRows}
              awardAmount={trackedGrant.awardAmount.toString()}
              canEdit={canManageFinancials}
            />
            <GrantBudgetPanel
              grantId={trackedGrant.id}
              grantOpportunityId={opportunity.id}
              budgetLines={budgetLineRows}
              canEdit={canManageFinancials}
            />
          </div>
        ) : (
          <div className="rounded-[16px] border border-dashed border-gray-200 p-8 text-center text-sm text-gray-600">
            Disbursements and budget tracking start once this grant is awarded and converted.
          </div>
        );

        const documentsTab = (
          <GrantDocumentsPanel
            grantOpportunityId={opportunity.id}
            documents={documentRows}
            attachOptions={attachOptions}
            canEdit={canManageDocuments}
          />
        );

        const commentsTab = (
          <GrantCommentsPanel
            grantOpportunityId={opportunity.id}
            comments={commentRows}
            canPost={canComment}
            canDeleteAny={isAdmin}
          />
        );

        const tasksTab = (
          <RelatedTasksPanel
            grantOpportunityId={opportunity.id}
            tasks={taskRows}
            users={users}
            currentUserId={session!.user.id}
            canDelete={canDeleteTasks}
          />
        );

        const tabs: DetailTab[] = [
          { key: 'overview', label: 'Overview', content: overviewTab },
          { key: 'compliance', label: 'Compliance', content: complianceTab },
          { key: 'financials', label: 'Financials', content: financialsTab },
          { key: 'documents', label: 'Documents', count: documentRows.length, content: documentsTab },
          { key: 'comments', label: 'Notes', count: commentRows.length, content: commentsTab },
          { key: 'tasks', label: 'Tasks', count: taskRows.length, content: tasksTab },
        ];

        return (
          <div className="mt-6">
            <DetailTabs tabs={tabs} />
          </div>
        );
      })()}

      {canManageOpportunities && (
        <div className="mt-6">
          <Link
            href={`/grants/${opportunity.id}/edit`}
            className="text-[13px] font-semibold text-evergreen hover:text-[#0d685f]"
          >
            Edit grant details →
          </Link>
        </div>
      )}
    </div>
  );
}

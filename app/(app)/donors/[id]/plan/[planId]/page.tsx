import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Pencil } from 'lucide-react';
import { auth } from '@/auth';
import { forOrg } from '@/lib/tenant-db';
import { permissions } from '@/lib/permissions';
import { Role } from '@prisma/client';
import StageBadge from '@/components/plans/StageBadge';
import PlanStatusBadge from '@/components/plans/PlanStatusBadge';
import DeletePlanButton from '@/components/plans/DeletePlanButton';
import MilestonesPanel, { type MilestoneRow } from '@/components/plans/MilestonesPanel';
import ApplyPlanTemplateButton from '@/components/plans/ApplyPlanTemplateButton';
import PlanCommentsPanel, { type PlanCommentRow } from '@/components/plans/PlanCommentsPanel';
import DetailTabs, { type DetailTab } from '@/components/ui/DetailTabs';
import { donorDisplayName, formatCurrency, formatDate } from '@/lib/format';

export default async function PlanDetailPage({
  params,
}: {
  params: { id: string; planId: string };
}) {
  const session = await auth();
  const db = forOrg(session!.user.organizationId);

  const [plan, users, planTemplates] = await Promise.all([
    db.donorSuccessPlan.findUnique({
      where: { id: params.planId },
      include: {
        donor: { select: { id: true, firstName: true, lastName: true, organizationName: true } },
        owner: { select: { name: true, email: true } },
        milestones: {
          orderBy: [{ status: 'desc' }, { dueDate: 'asc' }],
          include: { owner: { select: { name: true, email: true } } },
        },
        comments: {
          orderBy: { createdAt: 'asc' },
          include: { author: { select: { name: true, email: true } } },
        },
      },
    }),
    db.user.findMany({
      where: { isActive: true },
      select: { id: true, name: true, email: true },
      orderBy: { name: 'asc' },
    }),
    db.planTemplate.findMany({
      select: { id: true, name: true, _count: { select: { milestoneTemplates: true } } },
      orderBy: { name: 'asc' },
    }),
  ]);

  if (!plan || plan.donorId !== params.id) notFound();

  const canEdit = permissions.canEditDonors(session!.user.role as Role);
  const canDelete = permissions.canDeleteRecords(session!.user.role as Role);

  const milestoneRows: MilestoneRow[] = plan.milestones.map((m) => ({
    id: m.id,
    title: m.title,
    status: m.status,
    priority: m.priority,
    category: m.category,
    dueDate: m.dueDate ? m.dueDate.toISOString() : null,
    notes: m.notes,
    ownerId: m.ownerId,
    ownerName: m.owner?.name ?? m.owner?.email ?? null,
  }));

  const commentRows: PlanCommentRow[] = plan.comments.map((c) => ({
    id: c.id,
    content: c.content,
    isSystemGenerated: c.isSystemGenerated,
    authorName: c.author?.name ?? c.author?.email ?? null,
    createdAt: c.createdAt.toISOString(),
    isOwn: c.authorId === session!.user.id,
  }));

  return (
    <div className="max-w-3xl">
      <Link
        href={`/donors/${plan.donor.id}`}
        className="text-xs font-semibold text-gray-600 hover:text-evergreen"
      >
        &larr; {donorDisplayName(plan.donor)}
      </Link>

      <div className="mt-2 flex items-start justify-between gap-4">
        <div>
          <div className="mb-2 flex items-center gap-2.5">
            <StageBadge stage={plan.stage} />
            <PlanStatusBadge status={plan.status} />
          </div>
          <h1 className="text-2xl font-extrabold text-gray-900">{plan.title}</h1>
        </div>

        {canEdit && (
          <div className="flex flex-shrink-0 items-center gap-2.5">
            <Link
              href={`/donors/${plan.donor.id}/plan/${plan.id}/edit`}
              className="flex items-center gap-1.5 rounded-xl border border-gray-200 px-4 py-2.5 text-[13.5px] font-semibold text-gray-900 transition-colors hover:border-gray-300"
            >
              <Pencil size={15} />
              Edit
            </Link>
            {canDelete && <DeletePlanButton planId={plan.id} />}
          </div>
        )}
      </div>

      <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Stat
          label="Target ask"
          value={plan.targetAskAmount ? formatCurrency(plan.targetAskAmount.toString()) : '—'}
        />
        <Stat label="Target gift date" value={formatDate(plan.targetGiftDate)} />
        <Stat label="Review cadence" value={plan.reviewCadence ?? '—'} />
        <Stat label="Owner" value={plan.owner.name ?? plan.owner.email} />
      </div>

      {(() => {
        const overviewTab = (
          <div className="flex flex-col gap-4">
            {!plan.objective && !plan.strategyNotes && (
              <p className="text-sm text-gray-600">No objective or strategy notes added yet.</p>
            )}
            {plan.objective && (
              <div className="rounded-[16px] border border-gray-200 bg-white p-6">
                <h2 className="text-[13px] font-bold uppercase tracking-wide text-gray-600">
                  Objective
                </h2>
                <p className="mt-2 whitespace-pre-wrap text-sm text-gray-900">{plan.objective}</p>
              </div>
            )}
            {plan.strategyNotes && (
              <div className="rounded-[16px] border border-gray-200 bg-white p-6">
                <h2 className="text-[13px] font-bold uppercase tracking-wide text-gray-600">
                  Strategy notes
                </h2>
                <p className="mt-2 whitespace-pre-wrap text-sm text-gray-900">
                  {plan.strategyNotes}
                </p>
              </div>
            )}
          </div>
        );

        const milestonesTab = (
          <div>
            {canEdit && (
              <ApplyPlanTemplateButton
                planId={plan.id}
                donorId={plan.donor.id}
                templates={planTemplates.map((t) => ({
                  id: t.id,
                  name: t.name,
                  milestoneCount: t._count.milestoneTemplates,
                }))}
              />
            )}
            <MilestonesPanel
              planId={plan.id}
              donorId={plan.donor.id}
              milestones={milestoneRows}
              users={users}
              canDelete={canEdit}
            />
          </div>
        );

        const notesTab = (
          <PlanCommentsPanel
            donorId={plan.donor.id}
            planId={plan.id}
            comments={commentRows}
            canPost={canEdit}
            canDeleteAny={permissions.canManageOrgSettings(session!.user.role as Role)}
          />
        );

        const tabs: DetailTab[] = [
          { key: 'overview', label: 'Overview', content: overviewTab },
          { key: 'milestones', label: 'Milestones', count: milestoneRows.length, content: milestonesTab },
          { key: 'notes', label: 'Notes', count: commentRows.length, content: notesTab },
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

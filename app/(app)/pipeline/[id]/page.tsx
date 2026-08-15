import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Pencil, User, Landmark } from 'lucide-react';
import { auth } from '@/auth';
import { forOrg } from '@/lib/tenant-db';
import { permissions } from '@/lib/permissions';
import { hasGrantCapability } from '@/lib/grant-permissions';
import { Role, GrantRole, TaskStatus } from '@prisma/client';
import StageBadge from '@/components/pipeline/StageBadge';
import DeleteOpportunityButton from '@/components/pipeline/DeleteOpportunityButton';
import RelatedTasksPanel from '@/components/tasks/RelatedTasksPanel';
import { type TaskRowData } from '@/components/tasks/TaskRow';
import { donorDisplayName, formatCurrency, formatDate } from '@/lib/format';
import { effectiveProbability } from '@/lib/pipeline';

export default async function OpportunityDetailPage({ params }: { params: { id: string } }) {
  const session = await auth();
  const db = forOrg(session!.user.organizationId);

  const [opportunity, users] = await Promise.all([
    db.opportunity.findUnique({
      where: { id: params.id },
      include: {
        donor: { select: { id: true, firstName: true, lastName: true, organizationName: true } },
        owner: { select: { name: true, email: true } },
        tasks: {
          where: { status: { not: TaskStatus.DONE } },
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

  const canEdit = permissions.canEditDonors(session!.user.role as Role);
  const canDelete = permissions.canDeleteRecords(session!.user.role as Role);
  const canConvertToGrant =
    canEdit && hasGrantCapability(session!.user.role as Role, session!.user.grantRole as GrantRole | null, 'MANAGE_OPPORTUNITIES');
  const probability = effectiveProbability(opportunity.stage, opportunity.probability);
  const weightedAmount = opportunity.askAmount
    ? (Number(opportunity.askAmount) * probability) / 100
    : null;

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
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="mb-2">
            <StageBadge stage={opportunity.stage} />
          </div>
          <h1 className="text-2xl font-extrabold text-gray-900">{opportunity.name}</h1>
          <Link
            href={`/donors/${opportunity.donor.id}`}
            className="mt-1.5 flex items-center gap-1.5 text-sm font-medium text-evergreen"
          >
            <User size={14} />
            {donorDisplayName(opportunity.donor)}
          </Link>
        </div>

        {canEdit && (
          <div className="flex flex-shrink-0 items-center gap-2.5">
            {canConvertToGrant && (
              <Link
                href={`/pipeline/${opportunity.id}/convert-to-grant`}
                className="flex items-center gap-1.5 rounded-xl border border-gray-200 px-4 py-2.5 text-[13.5px] font-semibold text-gray-900 transition-colors hover:border-gray-300"
              >
                <Landmark size={15} />
                Convert to Grant
              </Link>
            )}
            <Link
              href={`/pipeline/${opportunity.id}/edit`}
              className="flex items-center gap-1.5 rounded-xl border border-gray-200 px-4 py-2.5 text-[13.5px] font-semibold text-gray-900 transition-colors hover:border-gray-300"
            >
              <Pencil size={15} />
              Edit
            </Link>
            {canDelete && <DeleteOpportunityButton opportunityId={opportunity.id} />}
          </div>
        )}
      </div>

      <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Stat label="Ask amount" value={opportunity.askAmount ? formatCurrency(opportunity.askAmount.toString()) : '—'} />
        <Stat
          label="Expected amount"
          value={opportunity.expectedAmount ? formatCurrency(opportunity.expectedAmount.toString()) : '—'}
        />
        <Stat label="Probability" value={`${probability}%`} />
        <Stat label="Weighted value" value={weightedAmount ? formatCurrency(weightedAmount) : '—'} />
      </div>

      <div className="mt-6 grid grid-cols-2 gap-4">
        <div className="rounded-[14px] border border-gray-200 bg-white p-4">
          <div className="text-[11px] font-semibold uppercase tracking-wide text-gray-600">
            Expected close
          </div>
          <div className="mt-1 text-sm font-bold text-gray-900">
            {formatDate(opportunity.expectedCloseDate)}
          </div>
        </div>
        <div className="rounded-[14px] border border-gray-200 bg-white p-4">
          <div className="text-[11px] font-semibold uppercase tracking-wide text-gray-600">
            Owner
          </div>
          <div className="mt-1 text-sm font-bold text-gray-900">
            {opportunity.owner.name ?? opportunity.owner.email}
          </div>
        </div>
      </div>

      {opportunity.notes && (
        <div className="mt-6 rounded-[16px] border border-gray-200 bg-white p-6">
          <h2 className="text-[13px] font-bold uppercase tracking-wide text-gray-600">Notes</h2>
          <p className="mt-2 whitespace-pre-wrap text-sm text-gray-900">{opportunity.notes}</p>
        </div>
      )}

      <div className="mt-6">
        <RelatedTasksPanel
          opportunityId={opportunity.id}
          tasks={taskRows}
          users={users}
          currentUserId={session!.user.id}
          canDelete={canEdit}
        />
      </div>
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

import Link from 'next/link';
import { Plus } from 'lucide-react';
import { auth } from '@/auth';
import { forOrg } from '@/lib/tenant-db';
import { permissions } from '@/lib/permissions';
import { Role, TaskStatus } from '@prisma/client';
import TaskRow, { type TaskRowData } from '@/components/tasks/TaskRow';
import { donorDisplayName } from '@/lib/format';

export default async function TasksPage({
  searchParams,
}: {
  searchParams: { scope?: string; status?: string };
}) {
  const session = await auth();
  const db = forOrg(session!.user.organizationId);
  const canCreate = permissions.canEditDonors(session!.user.role as Role);
  const canDelete = permissions.canEditDonors(session!.user.role as Role);

  const scope = searchParams.scope === 'all' ? 'all' : 'mine';
  const status = searchParams.status === 'done' ? 'done' : searchParams.status === 'all' ? 'all' : 'open';

  const where = {
    ...(scope === 'mine' ? { assignedToId: session!.user.id } : {}),
    ...(status === 'open'
      ? { status: { in: [TaskStatus.OPEN, TaskStatus.IN_PROGRESS] } }
      : status === 'done'
        ? { status: TaskStatus.DONE }
        : {}),
  };

  const tasks = await db.task.findMany({
    where,
    orderBy: [{ dueDate: { sort: 'asc', nulls: 'last' } }, { createdAt: 'desc' }],
    include: {
      assignedTo: { select: { name: true, email: true } },
      donor: { select: { firstName: true, lastName: true, organizationName: true } },
      opportunity: { select: { name: true } },
      grantOpportunity: { select: { name: true } },
    },
  });

  const rows: TaskRowData[] = tasks.map((t) => ({
    id: t.id,
    title: t.title,
    status: t.status,
    priority: t.priority,
    dueDate: t.dueDate ? t.dueDate.toISOString() : null,
    assigneeName: t.assignedTo.name ?? t.assignedTo.email,
    donorId: t.donorId,
    donorName: t.donor ? donorDisplayName(t.donor) : null,
    opportunityId: t.opportunityId,
    opportunityName: t.opportunity?.name ?? null,
    grantOpportunityId: t.grantOpportunityId,
    grantOpportunityName: t.grantOpportunity?.name ?? null,
  }));

  function href(params: Record<string, string>) {
    const usp = new URLSearchParams({ scope, status, ...params });
    return `/tasks?${usp.toString()}`;
  }

  return (
    <div className="max-w-4xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-gray-900">Tasks</h1>
          <p className="mt-1 text-sm text-gray-600">{tasks.length} task{tasks.length === 1 ? '' : 's'}</p>
        </div>
        {canCreate && (
          <Link
            href="/tasks/new"
            className="flex items-center gap-2 rounded-xl bg-evergreen px-5 py-3 text-[14px] font-semibold text-white transition-all hover:-translate-y-0.5 hover:bg-[#0d685f]"
          >
            <Plus size={16} />
            New Task
          </Link>
        )}
      </div>

      <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-2">
          <FilterLink href={href({ scope: 'mine' })} active={scope === 'mine'}>
            My tasks
          </FilterLink>
          <FilterLink href={href({ scope: 'all' })} active={scope === 'all'}>
            All tasks
          </FilterLink>
        </div>
        <div className="flex gap-2">
          <FilterLink href={href({ status: 'open' })} active={status === 'open'}>
            Open
          </FilterLink>
          <FilterLink href={href({ status: 'done' })} active={status === 'done'}>
            Done
          </FilterLink>
          <FilterLink href={href({ status: 'all' })} active={status === 'all'}>
            All
          </FilterLink>
        </div>
      </div>

      <div className="mt-5 divide-y divide-gray-50 rounded-[16px] border border-gray-200 bg-white">
        {rows.length === 0 && (
          <p className="px-5 py-10 text-center text-sm text-gray-600">No tasks match this view.</p>
        )}
        {rows.map((t) => (
          <TaskRow key={t.id} task={t} canDelete={canDelete} />
        ))}
      </div>
    </div>
  );
}

function FilterLink({
  href,
  active,
  children,
}: {
  href: string;
  active: boolean;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className={`rounded-full border px-3.5 py-1.5 text-[12.5px] font-semibold transition-colors ${
        active ? 'border-evergreen bg-evergreen/5 text-evergreen' : 'border-gray-200 text-gray-600'
      }`}
    >
      {children}
    </Link>
  );
}

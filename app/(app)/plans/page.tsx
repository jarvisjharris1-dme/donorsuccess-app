import Link from 'next/link';
import { auth } from '@/auth';
import { forOrg } from '@/lib/tenant-db';
import { PlanStatus, MilestoneStatus, Role } from '@prisma/client';
import { PLAN_STATUSES, PLAN_STATUS_LABELS } from '@/lib/success-plans';
import StageBadge from '@/components/plans/StageBadge';
import ViewScopeToggle from '@/components/shared/ViewScopeToggle';
import { resolveScope } from '@/lib/scope';
import { donorDisplayName, formatCurrency, formatDate } from '@/lib/format';

export default async function PlansOverviewPage({
  searchParams,
}: {
  searchParams: { status?: string; scope?: string };
}) {
  const session = await auth();
  const db = forOrg(session!.user.organizationId);

  const status =
    searchParams.status && PLAN_STATUSES.includes(searchParams.status as PlanStatus)
      ? (searchParams.status as PlanStatus)
      : PlanStatus.ACTIVE;
  const scope = resolveScope(session!.user.role as Role, searchParams.scope);

  const plans = await db.donorSuccessPlan.findMany({
    where: { status, ...(scope === 'mine' ? { ownerId: session!.user.id } : {}) },
    orderBy: { updatedAt: 'desc' },
    include: {
      donor: { select: { id: true, firstName: true, lastName: true, organizationName: true } },
      owner: { select: { name: true, email: true } },
      milestones: { select: { status: true, dueDate: true } },
    },
  });

  return (
    <div className="max-w-5xl">
      <div>
        <h1 className="text-2xl font-extrabold text-gray-900">Success Plans</h1>
        <p className="mt-1 text-sm text-gray-600">
          {plans.length} plan{plans.length === 1 ? '' : 's'}
          {scope === 'mine' ? ' you own' : ''}
        </p>
      </div>

      <div className="mt-5">
        <ViewScopeToggle activeScope={scope} />
      </div>

      <div className="mt-6 flex gap-2">
        {PLAN_STATUSES.map((s) => (
          <Link
            key={s}
            href={`/plans?status=${s}${scope === 'mine' ? '&scope=mine' : ''}`}
            className={`rounded-full border px-3.5 py-1.5 text-[12.5px] font-semibold transition-colors ${
              status === s ? 'border-evergreen bg-evergreen/5 text-evergreen' : 'border-gray-200 text-gray-600'
            }`}
          >
            {PLAN_STATUS_LABELS[s]}
          </Link>
        ))}
      </div>

      <div className="mt-6 overflow-hidden rounded-[16px] border border-gray-200 bg-white">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-gray-100 text-xs font-semibold uppercase tracking-wide text-gray-600">
              <th className="px-5 py-3.5">Donor</th>
              <th className="px-5 py-3.5">Plan</th>
              <th className="px-5 py-3.5">Stage</th>
              <th className="px-5 py-3.5">Target</th>
              <th className="px-5 py-3.5">Milestones</th>
              <th className="px-5 py-3.5">Next due</th>
              <th className="px-5 py-3.5">Owner</th>
            </tr>
          </thead>
          <tbody>
            {plans.length === 0 && (
              <tr>
                <td colSpan={7} className="px-5 py-10 text-center text-sm text-gray-600">
                  No plans match this view.
                </td>
              </tr>
            )}
            {plans.map((p) => {
              const doneCount = p.milestones.filter((m) => m.status === MilestoneStatus.DONE).length;
              const nextDue = p.milestones
                .filter((m) => m.status !== MilestoneStatus.DONE && m.dueDate)
                .sort((a, b) => (a.dueDate!.getTime() < b.dueDate!.getTime() ? -1 : 1))[0]?.dueDate;

              return (
                <tr key={p.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50">
                  <td className="px-5 py-3.5">
                    <Link
                      href={`/donors/${p.donor.id}`}
                      className="font-semibold text-gray-900 hover:text-evergreen"
                    >
                      {donorDisplayName(p.donor)}
                    </Link>
                  </td>
                  <td className="px-5 py-3.5">
                    <Link
                      href={`/donors/${p.donor.id}/plan/${p.id}`}
                      className="text-gray-900 hover:text-evergreen"
                    >
                      {p.title}
                    </Link>
                  </td>
                  <td className="px-5 py-3.5">
                    <StageBadge stage={p.stage} />
                  </td>
                  <td className="px-5 py-3.5 text-gray-600">
                    {p.targetAskAmount ? formatCurrency(p.targetAskAmount.toString()) : '—'}
                  </td>
                  <td className="px-5 py-3.5 text-gray-600">
                    {doneCount}/{p.milestones.length}
                  </td>
                  <td className="px-5 py-3.5 text-gray-600">{formatDate(nextDue)}</td>
                  <td className="px-5 py-3.5 text-gray-600">{p.owner.name ?? p.owner.email}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

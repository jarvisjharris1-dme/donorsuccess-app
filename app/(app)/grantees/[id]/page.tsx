import Link from 'next/link';
import { notFound } from 'next/navigation';
import { auth } from '@/auth';
import { forOrg } from '@/lib/tenant-db';
import { APPLICATION_STATUS_LABELS, APPLICATION_STATUS_STYLES } from '@/lib/allocations';
import { formatCurrency } from '@/lib/format';

export default async function GranteeDetailPage({ params }: { params: { id: string } }) {
  const session = await auth();
  const db = forOrg(session!.user.organizationId);

  const grantee = await db.grantee.findUnique({
    where: { id: params.id },
    include: {
      applications: {
        include: { fundingRound: { select: { name: true } }, categoryRequests: { include: { allocation: true } } },
        orderBy: { createdAt: 'desc' },
      },
    },
  });
  if (!grantee) notFound();

  return (
    <div className="max-w-4xl">
      <h1 className="text-2xl font-extrabold text-gray-900">{grantee.legalName}</h1>
      <p className="mt-1 text-sm text-gray-600">
        {grantee.ein ? `EIN ${grantee.ein}` : 'No EIN on file'}
        {grantee.contactName ? ` · ${grantee.contactName}` : ''}
        {grantee.contactEmail ? ` · ${grantee.contactEmail}` : ''}
      </p>
      {grantee.missionSummary && <p className="mt-3 text-sm text-gray-700">{grantee.missionSummary}</p>}

      <div className="mt-6 rounded-[16px] border border-gray-200 bg-white">
        <div className="p-6 pb-0">
          <h2 className="text-[15px] font-bold text-gray-900">Applications</h2>
        </div>
        <div className="mt-4 flex flex-col">
          {grantee.applications.length === 0 && (
            <p className="px-6 pb-6 text-sm text-gray-600">No applications yet.</p>
          )}
          {grantee.applications.map((app) => {
            const allocated = app.categoryRequests.reduce(
              (sum, r) => sum + (r.allocation ? Number(r.allocation.allocatedAmount) : 0),
              0,
            );
            return (
              <Link
                key={app.id}
                href={`/grantee-applications/${app.id}`}
                className="flex items-center gap-4 border-t border-gray-100 px-6 py-4 first:border-t-0 hover:bg-gray-50"
              >
                <span
                  className={`w-[110px] flex-shrink-0 rounded-full px-2.5 py-1 text-center text-[11px] font-semibold ${APPLICATION_STATUS_STYLES[app.status]}`}
                >
                  {APPLICATION_STATUS_LABELS[app.status]}
                </span>
                <p className="min-w-0 flex-1 truncate text-[14px] font-medium text-gray-900">
                  {app.fundingRound.name}
                </p>
                <p className="flex-shrink-0 text-[13px] text-gray-600">Allocated {formatCurrency(allocated)}</p>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}

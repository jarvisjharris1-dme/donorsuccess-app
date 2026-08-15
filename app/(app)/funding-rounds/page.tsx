import Link from 'next/link';
import { Plus } from 'lucide-react';
import { auth } from '@/auth';
import { forOrg } from '@/lib/tenant-db';
import { hasGrantCapability } from '@/lib/grant-permissions';
import { Role, GrantRole } from '@prisma/client';
import { FUNDING_ROUND_STATUS_LABELS, FUNDING_ROUND_STATUS_STYLES } from '@/lib/allocations';
import { formatCurrency, formatDate } from '@/lib/format';

export default async function FundingRoundsPage() {
  const session = await auth();
  const db = forOrg(session!.user.organizationId);
  const canCreate = hasGrantCapability(
    session!.user.role as Role,
    session!.user.grantRole as GrantRole | null,
    'MANAGE_FUNDING_ROUNDS',
  );

  const rounds = await db.fundingRound.findMany({
    orderBy: { createdAt: 'desc' },
    include: { granteeApplications: { select: { id: true } } },
  });

  return (
    <div className="max-w-4xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-gray-900">Allocations</h1>
          <p className="mt-1 text-sm text-gray-600">
            Pooled funding rounds this organization administers, and the agencies applying to them.
          </p>
        </div>
        {canCreate && (
          <Link
            href="/funding-rounds/new"
            className="flex items-center gap-2 rounded-xl bg-evergreen px-5 py-3 text-[14px] font-semibold text-white transition-all hover:-translate-y-0.5 hover:bg-[#0d685f]"
          >
            <Plus size={16} />
            New funding round
          </Link>
        )}
      </div>

      <div className="mt-6 flex flex-col gap-2">
        {rounds.length === 0 && (
          <div className="rounded-[16px] border border-dashed border-gray-200 p-8 text-center text-sm text-gray-600">
            No funding rounds yet.
          </div>
        )}
        {rounds.map((round) => (
          <Link
            key={round.id}
            href={`/funding-rounds/${round.id}`}
            className="flex items-center gap-4 rounded-[16px] border border-gray-200 bg-white p-4 transition-colors hover:border-gray-300"
          >
            <span
              className={`w-[100px] flex-shrink-0 rounded-full px-2.5 py-1.5 text-center text-[11px] font-semibold ${FUNDING_ROUND_STATUS_STYLES[round.status]}`}
            >
              {FUNDING_ROUND_STATUS_LABELS[round.status]}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-[15px] font-semibold text-gray-900">{round.name}</p>
              <p className="mt-0.5 text-[13px] text-gray-600">
                {round.granteeApplications.length} application
                {round.granteeApplications.length === 1 ? '' : 's'}
                {round.closesAt ? ` · Closes ${formatDate(round.closesAt)}` : ''}
              </p>
            </div>
            <p className="flex-shrink-0 text-[15px] font-semibold text-gray-900">
              {formatCurrency(round.totalPool.toString())}
            </p>
          </Link>
        ))}
      </div>
    </div>
  );
}

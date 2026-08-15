import Link from 'next/link';
import { Plus } from 'lucide-react';
import { auth } from '@/auth';
import { forOrg } from '@/lib/tenant-db';
import { hasGrantCapability } from '@/lib/grant-permissions';
import { Role, GrantRole } from '@prisma/client';
import { GRANT_STAGE_LABELS, GRANT_STAGE_STYLES, OPEN_GRANT_STAGES } from '@/lib/grants';
import { donorDisplayName, formatCurrency, formatDate } from '@/lib/format';

export default async function GrantsPage() {
  const session = await auth();
  const db = forOrg(session!.user.organizationId);
  const canCreate = hasGrantCapability(
    session!.user.role as Role,
    session!.user.grantRole as GrantRole | null,
    'MANAGE_OPPORTUNITIES',
  );

  const grants = await db.grantOpportunity.findMany({
    orderBy: { createdAt: 'desc' },
    include: {
      donor: { select: { firstName: true, lastName: true, organizationName: true } },
      requirements: { select: { isComplete: true } },
    },
  });

  const openGrants = grants.filter((g) => OPEN_GRANT_STAGES.includes(g.stage));
  const openTotal = openGrants.reduce((sum, g) => sum + Number(g.askAmount), 0);

  return (
    <div className="max-w-4xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-gray-900">Grant opportunities</h1>
          <p className="mt-1 text-sm text-gray-600">
            {openGrants.length} active &middot; {formatCurrency(openTotal.toString())} in requested funding
          </p>
        </div>
        {canCreate && (
          <div className="flex items-center gap-3">
            <Link
              href="/grants/import"
              className="text-[13.5px] font-semibold text-evergreen hover:text-[#0d685f]"
            >
              Import grants
            </Link>
            <Link
              href="/grants/new"
              className="flex items-center gap-2 rounded-xl bg-evergreen px-5 py-3 text-[14px] font-semibold text-white transition-all hover:-translate-y-0.5 hover:bg-[#0d685f]"
            >
              <Plus size={16} />
              New grant opportunity
            </Link>
          </div>
        )}
      </div>

      <div className="mt-6 flex flex-col gap-2">
        {grants.length === 0 && (
          <div className="rounded-[16px] border border-dashed border-gray-200 p-8 text-center text-sm text-gray-600">
            No grant opportunities yet.
          </div>
        )}
        {grants.map((g) => {
          const completeCount = g.requirements.filter((r) => r.isComplete).length;
          const isTerminal = g.stage === 'AWARDED' || g.stage === 'DECLINED';
          return (
            <Link
              key={g.id}
              href={`/grants/${g.id}`}
              className={`flex items-center gap-4 rounded-[16px] border border-gray-200 p-4 transition-colors hover:border-gray-300 ${
                isTerminal ? 'bg-white opacity-70' : 'bg-white'
              }`}
            >
              <span
                className={`w-[130px] flex-shrink-0 rounded-full px-2.5 py-1.5 text-center text-[11px] font-semibold ${GRANT_STAGE_STYLES[g.stage as keyof typeof GRANT_STAGE_STYLES]}`}
              >
                {GRANT_STAGE_LABELS[g.stage as keyof typeof GRANT_STAGE_LABELS]}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[14px] font-semibold text-gray-900">
                  {donorDisplayName(g.donor)} — {g.name}
                </p>
                <p className="mt-0.5 text-xs text-gray-500">
                  {g.applicationDeadline
                    ? `Deadline ${formatDate(g.applicationDeadline.toISOString())}`
                    : g.decisionExpectedDate
                      ? `Decision expected ${formatDate(g.decisionExpectedDate.toISOString())}`
                      : 'No dates set'}
                  {g.requirements.length > 0 && ` · ${completeCount} of ${g.requirements.length} requirements complete`}
                </p>
              </div>
              <span className="flex-shrink-0 text-[14px] font-semibold text-gray-900">
                {formatCurrency(g.askAmount.toString())}
              </span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

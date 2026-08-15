import Link from 'next/link';
import { Plus, Lock } from 'lucide-react';
import { auth } from '@/auth';
import { forOrg } from '@/lib/tenant-db';
import { permissions } from '@/lib/permissions';
import { Role, CampaignStatus } from '@prisma/client';
import { CAMPAIGN_STATUSES, STATUS_LABELS, CHANNEL_LABELS } from '@/lib/campaigns';
import StatusBadge from '@/components/campaigns/StatusBadge';
import ProgressBar from '@/components/campaigns/ProgressBar';
import { formatCurrency, formatDate } from '@/lib/format';

export default async function CampaignsPage({
  searchParams,
}: {
  searchParams: { status?: string };
}) {
  const session = await auth();
  const db = forOrg(session!.user.organizationId);
  const canCreate = permissions.canEditDonors(session!.user.role as Role);
  const myId = session!.user.id;

  // Fundraisers only see campaigns visible to them (org-wide, or
  // specifically assigned) — Owner/Admin/Viewer see everything, since
  // restricting oversight roles from a campaign that's deliberately
  // hidden from most fundraisers wouldn't serve the point of the
  // restriction.
  const isFundraiser = (session!.user.role as Role) === Role.FUNDRAISER;
  const visibilityFilter = isFundraiser
    ? { OR: [{ visibleToAll: true }, { assignedFundraisers: { some: { id: myId } } }] }
    : {};

  const status = searchParams.status;
  const statusFilter =
    status && CAMPAIGN_STATUSES.includes(status as CampaignStatus)
      ? { status: status as CampaignStatus }
      : {};

  // Only top-level campaigns drive the main grid — sub-campaigns nest
  // inside their parent's card instead of appearing as their own
  // top-level tile.
  const campaigns = await db.campaign.findMany({
    where: { parentCampaignId: null, ...statusFilter, ...visibilityFilter },
    orderBy: { createdAt: 'desc' },
    include: {
      _count: { select: { gifts: true } },
      subCampaigns: {
        where: visibilityFilter,
        orderBy: { createdAt: 'desc' },
        include: { _count: { select: { gifts: true } } },
      },
    },
  });

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-gray-900">Campaigns</h1>
          <p className="mt-1 text-sm text-gray-600">
            {campaigns.length} campaign{campaigns.length === 1 ? '' : 's'}
          </p>
        </div>
        {canCreate && (
          <Link
            href="/campaigns/new"
            className="flex items-center gap-2 rounded-xl bg-evergreen px-5 py-3 text-[14px] font-semibold text-white transition-all hover:-translate-y-0.5 hover:bg-[#0d685f]"
          >
            <Plus size={16} />
            New Campaign
          </Link>
        )}
      </div>

      <div className="mt-6 flex gap-2">
        <FilterLink href="/campaigns" active={!status}>
          All
        </FilterLink>
        {CAMPAIGN_STATUSES.map((s) => (
          <FilterLink key={s} href={`/campaigns?status=${s}`} active={status === s}>
            {STATUS_LABELS[s]}
          </FilterLink>
        ))}
      </div>

      <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {campaigns.length === 0 && (
          <p className="col-span-full py-10 text-center text-sm text-gray-600">
            No campaigns match this view.
          </p>
        )}
        {campaigns.map((c) => (
          <div
            key={c.id}
            className="rounded-[16px] border border-gray-200 bg-white p-5 transition-all hover:shadow-card"
          >
            <Link href={`/campaigns/${c.id}`}>
              <div className="flex items-start justify-between">
                <StatusBadge status={c.status} />
                <div className="flex items-center gap-2">
                  {!c.visibleToAll && (
                    <span title="Restricted to specific fundraisers">
                      <Lock size={12} className="text-gray-400" />
                    </span>
                  )}
                  <span className="text-[11px] font-semibold text-gray-600">
                    {CHANNEL_LABELS[c.channel as keyof typeof CHANNEL_LABELS]}
                  </span>
                </div>
              </div>
              <h3 className="mt-3 text-[16px] font-bold text-gray-900">{c.name}</h3>
              <div className="mt-1 text-xs text-gray-600">
                {c._count.gifts} gift{c._count.gifts === 1 ? '' : 's'}
                {c.startDate && <> &middot; starts {formatDate(c.startDate)}</>}
              </div>

              <div className="mt-4">
                <div className="mb-1.5 flex items-baseline justify-between">
                  <span className="text-lg font-extrabold text-gray-900">
                    {formatCurrency(c.raisedAmount.toString())}
                  </span>
                  {c.goalAmount && (
                    <span className="text-xs font-medium text-gray-600">
                      of {formatCurrency(c.goalAmount.toString())}
                    </span>
                  )}
                </div>
                <ProgressBar
                  raised={Number(c.raisedAmount)}
                  goal={c.goalAmount ? Number(c.goalAmount) : null}
                />
              </div>
            </Link>

            {c.subCampaigns.length > 0 && (
              <div className="mt-4 flex flex-col gap-2 border-t border-gray-100 pt-3">
                <span className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">
                  Sub-campaigns
                </span>
                {c.subCampaigns.map((sub) => (
                  <Link
                    key={sub.id}
                    href={`/campaigns/${sub.id}`}
                    className="flex items-center justify-between rounded-lg px-2 py-1.5 text-[13px] hover:bg-gray-50"
                  >
                    <span className="font-medium text-gray-900">{sub.name}</span>
                    <span className="text-xs text-gray-600">
                      {formatCurrency(sub.raisedAmount.toString())}
                    </span>
                  </Link>
                ))}
              </div>
            )}
          </div>
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

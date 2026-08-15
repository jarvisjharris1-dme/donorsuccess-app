import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Pencil, Lock, ArrowLeft } from 'lucide-react';
import { auth } from '@/auth';
import { forOrg } from '@/lib/tenant-db';
import { permissions } from '@/lib/permissions';
import { Role } from '@prisma/client';
import StatusBadge from '@/components/campaigns/StatusBadge';
import ProgressBar from '@/components/campaigns/ProgressBar';
import DeleteCampaignButton from '@/components/campaigns/DeleteCampaignButton';
import { CHANNEL_LABELS } from '@/lib/campaigns';
import { donorDisplayName, formatCurrency, formatDate } from '@/lib/format';

export default async function CampaignDetailPage({ params }: { params: { id: string } }) {
  const session = await auth();
  const db = forOrg(session!.user.organizationId);

  const [campaign, giftCount, distinctDonors] = await Promise.all([
    db.campaign.findUnique({
      where: { id: params.id },
      include: {
        gifts: {
          orderBy: { date: 'desc' },
          take: 50,
          include: {
            donor: { select: { id: true, firstName: true, lastName: true, organizationName: true } },
          },
        },
        parentCampaign: { select: { id: true, name: true } },
        subCampaigns: {
          orderBy: { createdAt: 'desc' },
          select: { id: true, name: true, raisedAmount: true },
        },
        assignedFundraisers: { select: { id: true, name: true, email: true } },
      },
    }),
    db.gift.count({ where: { campaignId: params.id } }),
    db.gift.findMany({
      where: { campaignId: params.id },
      select: { donorId: true },
      distinct: ['donorId'],
    }),
  ]);

  if (!campaign) notFound();

  // Fundraisers can't reach a restricted campaign by URL either, not
  // just filtered out of the list view.
  const isFundraiser = (session!.user.role as Role) === Role.FUNDRAISER;
  if (isFundraiser && !campaign.visibleToAll) {
    const isAssigned = campaign.assignedFundraisers.some((f) => f.id === session!.user.id);
    if (!isAssigned) notFound();
  }

  const canEdit = permissions.canEditDonors(session!.user.role as Role);
  const canDelete = permissions.canDeleteRecords(session!.user.role as Role);
  const uniqueDonorCount = distinctDonors.length;

  return (
    <div className="max-w-4xl">
      {campaign.parentCampaign && (
        <Link
          href={`/campaigns/${campaign.parentCampaign.id}`}
          className="flex items-center gap-1.5 text-[13px] font-semibold text-gray-600 hover:text-gray-900"
        >
          <ArrowLeft size={14} />
          {campaign.parentCampaign.name}
        </Link>
      )}

      <div className="mt-2 flex items-start justify-between gap-4">
        <div>
          <div className="mb-2 flex items-center gap-2.5">
            <StatusBadge status={campaign.status} />
            <span className="text-xs font-semibold text-gray-600">
              {CHANNEL_LABELS[campaign.channel as keyof typeof CHANNEL_LABELS]}
            </span>
            {!campaign.visibleToAll && (
              <span className="flex items-center gap-1 rounded-full bg-gray-100 px-2.5 py-1 text-[11px] font-semibold text-gray-600">
                <Lock size={11} />
                Restricted
              </span>
            )}
          </div>
          <h1 className="text-2xl font-extrabold text-gray-900">{campaign.name}</h1>
          {campaign.description && (
            <p className="mt-1.5 max-w-xl text-sm text-gray-600">{campaign.description}</p>
          )}
          {!campaign.visibleToAll && campaign.assignedFundraisers.length > 0 && (
            <p className="mt-2 text-xs text-gray-600">
              Visible to: {campaign.assignedFundraisers.map((f) => f.name ?? f.email).join(', ')}
            </p>
          )}
        </div>

        {canEdit && (
          <div className="flex flex-shrink-0 items-center gap-2.5">
            <Link
              href={`/campaigns/${campaign.id}/edit`}
              className="flex items-center gap-1.5 rounded-xl border border-gray-200 px-4 py-2.5 text-[13.5px] font-semibold text-gray-900 transition-colors hover:border-gray-300"
            >
              <Pencil size={15} />
              Edit
            </Link>
            {canDelete && <DeleteCampaignButton campaignId={campaign.id} />}
          </div>
        )}
      </div>

      <div className="mt-6 rounded-[16px] border border-gray-200 bg-white p-6">
        <div className="flex items-baseline justify-between">
          <span className="text-2xl font-extrabold text-gray-900">
            {formatCurrency(campaign.raisedAmount.toString())}
          </span>
          {campaign.goalAmount && (
            <span className="text-sm font-medium text-gray-600">
              of {formatCurrency(campaign.goalAmount.toString())} goal
            </span>
          )}
        </div>
        <div className="mt-3">
          <ProgressBar
            raised={Number(campaign.raisedAmount)}
            goal={campaign.goalAmount ? Number(campaign.goalAmount) : null}
          />
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Stat label="Gifts" value={String(giftCount)} />
        <Stat label="Unique donors" value={String(uniqueDonorCount)} />
        <Stat label="Start date" value={formatDate(campaign.startDate)} />
        <Stat label="End date" value={formatDate(campaign.endDate)} />
      </div>

      {campaign.subCampaigns.length > 0 && (
        <div className="mt-6 rounded-[16px] border border-gray-200 bg-white p-6">
          <h2 className="text-[15px] font-bold text-gray-900">Sub-campaigns</h2>
          <div className="mt-3 flex flex-col divide-y divide-gray-50">
            {campaign.subCampaigns.map((sub) => (
              <Link
                key={sub.id}
                href={`/campaigns/${sub.id}`}
                className="flex items-center justify-between py-3 hover:text-evergreen"
              >
                <span className="text-sm font-medium text-gray-900">{sub.name}</span>
                <span className="text-sm font-semibold text-gray-900">
                  {formatCurrency(sub.raisedAmount.toString())}
                </span>
              </Link>
            ))}
          </div>
        </div>
      )}

      <div className="mt-6 rounded-[16px] border border-gray-200 bg-white p-6">
        <div className="flex items-center justify-between">
          <h2 className="text-[15px] font-bold text-gray-900">Gifts</h2>
          {giftCount > 50 && (
            <span className="text-xs text-gray-600">Showing 50 most recent of {giftCount}</span>
          )}
        </div>
        <div className="mt-3 divide-y divide-gray-50">
          {campaign.gifts.length === 0 && (
            <p className="py-4 text-sm text-gray-600">No gifts logged against this campaign yet.</p>
          )}
          {campaign.gifts.map((g) => (
            <div key={g.id} className="flex items-center justify-between py-3">
              <Link
                href={`/donors/${g.donor.id}`}
                className="text-sm font-medium text-gray-900 hover:text-evergreen"
              >
                {donorDisplayName(g.donor)}
              </Link>
              <div className="flex items-center gap-4">
                <span className="text-sm font-semibold text-gray-900">
                  {formatCurrency(g.amount.toString())}
                </span>
                <span className="text-xs text-gray-600">{formatDate(g.date)}</span>
              </div>
            </div>
          ))}
        </div>
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

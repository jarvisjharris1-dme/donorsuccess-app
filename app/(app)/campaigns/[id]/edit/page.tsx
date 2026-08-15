import { notFound, redirect } from 'next/navigation';
import { auth } from '@/auth';
import { forOrg } from '@/lib/tenant-db';
import { permissions } from '@/lib/permissions';
import { Role } from '@prisma/client';
import CampaignForm from '@/components/campaigns/CampaignForm';

export default async function EditCampaignPage({ params }: { params: { id: string } }) {
  const session = await auth();
  if (!permissions.canEditDonors(session!.user.role as Role)) {
    redirect(`/campaigns/${params.id}`);
  }

  const db = forOrg(session!.user.organizationId);
  const [campaign, parentCampaignOptions, fundraisers] = await Promise.all([
    db.campaign.findUnique({
      where: { id: params.id },
      include: { assignedFundraisers: { select: { id: true } } },
    }),
    db.campaign.findMany({
      where: { parentCampaignId: null, id: { not: params.id } },
      select: { id: true, name: true },
      orderBy: { name: 'asc' },
    }),
    db.user.findMany({
      where: { isActive: true },
      select: { id: true, name: true, email: true },
      orderBy: { name: 'asc' },
    }),
  ]);

  if (!campaign) notFound();

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-extrabold text-gray-900">Edit campaign</h1>
      <p className="mt-1 text-sm text-gray-600">Update this campaign&rsquo;s details.</p>

      <div className="mt-6">
        <CampaignForm
          campaign={{
            ...campaign,
            goalAmount: campaign.goalAmount?.toString() ?? null,
            assignedFundraiserIds: campaign.assignedFundraisers.map((f) => f.id),
          }}
          parentCampaignOptions={parentCampaignOptions}
          fundraisers={fundraisers}
        />
      </div>
    </div>
  );
}

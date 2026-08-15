import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import { forOrg } from '@/lib/tenant-db';
import { permissions } from '@/lib/permissions';
import { Role } from '@prisma/client';
import CampaignForm from '@/components/campaigns/CampaignForm';

export default async function NewCampaignPage() {
  const session = await auth();
  if (!permissions.canEditDonors(session!.user.role as Role)) {
    redirect('/campaigns');
  }

  const db = forOrg(session!.user.organizationId);
  const [parentCampaignOptions, fundraisers] = await Promise.all([
    db.campaign.findMany({
      where: { parentCampaignId: null },
      select: { id: true, name: true },
      orderBy: { name: 'asc' },
    }),
    db.user.findMany({
      where: { isActive: true },
      select: { id: true, name: true, email: true },
      orderBy: { name: 'asc' },
    }),
  ]);

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-extrabold text-gray-900">New campaign</h1>
      <p className="mt-1 text-sm text-gray-600">Set up a campaign to track giving against.</p>

      <div className="mt-6">
        <CampaignForm parentCampaignOptions={parentCampaignOptions} fundraisers={fundraisers} />
      </div>
    </div>
  );
}

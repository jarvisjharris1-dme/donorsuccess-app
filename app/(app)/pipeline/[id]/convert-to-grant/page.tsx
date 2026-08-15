import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { auth } from '@/auth';
import { forOrg } from '@/lib/tenant-db';
import { permissions } from '@/lib/permissions';
import { hasGrantCapability } from '@/lib/grant-permissions';
import { Role, GrantRole } from '@prisma/client';
import { isOrgType } from '@/lib/donor-types';
import { donorDisplayName } from '@/lib/format';
import ConvertOpportunityToGrantForm from '@/components/pipeline/ConvertOpportunityToGrantForm';
import { defaultGrantStage } from '@/lib/grants';

export default async function ConvertToGrantPage({ params }: { params: { id: string } }) {
  const session = await auth();
  const role = session!.user.role as Role;
  const grantRole = session!.user.grantRole as GrantRole | null;

  if (!permissions.canEditDonors(role) || !hasGrantCapability(role, grantRole, 'MANAGE_OPPORTUNITIES')) {
    redirect(`/pipeline/${params.id}`);
  }

  const db = forOrg(session!.user.organizationId);
  const [opportunity, users] = await Promise.all([
    db.opportunity.findUnique({
      where: { id: params.id },
      include: { donor: true },
    }),
    db.user.findMany({
      where: { isActive: true },
      select: { id: true, name: true, email: true },
      orderBy: { name: 'asc' },
    }),
  ]);

  if (!opportunity) notFound();

  const donorIsOrgType = isOrgType(opportunity.donor.donorType);

  return (
    <div className="max-w-2xl">
      <Link
        href={`/pipeline/${opportunity.id}`}
        className="flex items-center gap-1.5 text-[13px] font-semibold text-gray-600 hover:text-gray-900"
      >
        <ArrowLeft size={14} />
        {opportunity.name}
      </Link>

      <h1 className="mt-2 text-2xl font-extrabold text-gray-900">Convert to grant</h1>
      <p className="mt-1 text-sm text-gray-600">
        Moves this opportunity into the Grants section as a new grant opportunity, and removes it
        from the regular pipeline so it isn&rsquo;t counted in both places.
      </p>

      {!donorIsOrgType ? (
        <div className="mt-6 rounded-[16px] border border-warning/30 bg-warning/5 p-6">
          <p className="text-sm font-semibold text-gray-900">
            {donorDisplayName(opportunity.donor)} is an individual donor, not an
            Organization/Foundation/Corporation.
          </p>
          <p className="mt-1.5 text-sm text-gray-700">
            Grants can only be attributed to organization-type funders. If this is actually a
            foundation or company, update the donor&rsquo;s type first, then come back here.
          </p>
          <Link
            href={`/donors/${opportunity.donor.id}/edit`}
            className="mt-4 inline-block text-[13px] font-semibold text-evergreen hover:text-[#0d685f]"
          >
            Edit donor record →
          </Link>
        </div>
      ) : (
        <div className="mt-6">
          <ConvertOpportunityToGrantForm
            opportunityId={opportunity.id}
            defaults={{
              name: opportunity.name,
              askAmount: opportunity.askAmount ? opportunity.askAmount.toString() : '',
              stage: defaultGrantStage(opportunity.stage),
              grantWriterId: opportunity.ownerId,
              expectedCloseDate: opportunity.expectedCloseDate
                ? opportunity.expectedCloseDate.toISOString().slice(0, 10)
                : null,
              notes: opportunity.notes,
            }}
            users={users}
          />
        </div>
      )}
    </div>
  );
}

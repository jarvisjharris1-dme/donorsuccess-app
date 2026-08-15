import { notFound, redirect } from 'next/navigation';
import { auth } from '@/auth';
import { forOrg } from '@/lib/tenant-db';
import { permissions } from '@/lib/permissions';
import { Role } from '@prisma/client';
import { donorDisplayName } from '@/lib/format';
import OpportunityForm from '@/components/pipeline/OpportunityForm';

export default async function EditOpportunityPage({ params }: { params: { id: string } }) {
  const session = await auth();
  if (!permissions.canEditDonors(session!.user.role as Role)) {
    redirect(`/pipeline/${params.id}`);
  }

  const db = forOrg(session!.user.organizationId);

  const [opportunity, donors, users] = await Promise.all([
    db.opportunity.findUnique({ where: { id: params.id } }),
    db.donor.findMany({
      select: { id: true, firstName: true, lastName: true, organizationName: true },
      orderBy: { lastName: 'asc' },
    }),
    db.user.findMany({
      where: { isActive: true },
      select: { id: true, name: true, email: true },
      orderBy: { name: 'asc' },
    }),
  ]);

  if (!opportunity) notFound();

  const donorOptions = donors.map((d) => ({ id: d.id, name: donorDisplayName(d) }));

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-extrabold text-gray-900">Edit opportunity</h1>
      <p className="mt-1 text-sm text-gray-600">Update this opportunity&rsquo;s details.</p>

      <div className="mt-6">
        <OpportunityForm
          opportunity={{
            ...opportunity,
            askAmount: opportunity.askAmount?.toString() ?? null,
            expectedAmount: opportunity.expectedAmount?.toString() ?? null,
          }}
          donors={donorOptions}
          users={users}
        />
      </div>
    </div>
  );
}

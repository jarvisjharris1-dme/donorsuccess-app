import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import { forOrg } from '@/lib/tenant-db';
import { permissions } from '@/lib/permissions';
import { Role } from '@prisma/client';
import { donorDisplayName } from '@/lib/format';
import OpportunityForm from '@/components/pipeline/OpportunityForm';

export default async function NewOpportunityPage({
  searchParams,
}: {
  searchParams: { donorId?: string };
}) {
  const session = await auth();
  if (!permissions.canEditDonors(session!.user.role as Role)) {
    redirect('/pipeline');
  }

  const db = forOrg(session!.user.organizationId);

  const [donors, users] = await Promise.all([
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

  const donorOptions = donors.map((d) => ({ id: d.id, name: donorDisplayName(d) }));

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-extrabold text-gray-900">New opportunity</h1>
      <p className="mt-1 text-sm text-gray-600">Add a major gift opportunity to the pipeline.</p>

      <div className="mt-6">
        <OpportunityForm
          donors={donorOptions}
          users={users}
          defaultDonorId={searchParams.donorId}
        />
      </div>
    </div>
  );
}

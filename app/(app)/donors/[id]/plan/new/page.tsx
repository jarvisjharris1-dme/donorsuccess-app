import { notFound, redirect } from 'next/navigation';
import Link from 'next/link';
import { auth } from '@/auth';
import { forOrg } from '@/lib/tenant-db';
import { permissions } from '@/lib/permissions';
import { Role } from '@prisma/client';
import { donorDisplayName } from '@/lib/format';
import PlanForm from '@/components/plans/PlanForm';

export default async function NewPlanPage({ params }: { params: { id: string } }) {
  const session = await auth();
  if (!permissions.canEditDonors(session!.user.role as Role)) {
    redirect(`/donors/${params.id}`);
  }

  const db = forOrg(session!.user.organizationId);

  const [donor, users] = await Promise.all([
    db.donor.findUnique({
      where: { id: params.id },
      select: { id: true, firstName: true, lastName: true, organizationName: true },
    }),
    db.user.findMany({
      where: { isActive: true },
      select: { id: true, name: true, email: true },
      orderBy: { name: 'asc' },
    }),
  ]);

  if (!donor) notFound();

  return (
    <div className="max-w-2xl">
      <Link href={`/donors/${donor.id}`} className="text-xs font-semibold text-gray-600 hover:text-evergreen">
        &larr; {donorDisplayName(donor)}
      </Link>
      <h1 className="mt-2 text-2xl font-extrabold text-gray-900">New Success Plan</h1>
      <p className="mt-1 text-sm text-gray-600">
        Set a cultivation strategy and target for {donorDisplayName(donor)}.
      </p>

      <div className="mt-6">
        <PlanForm donorId={donor.id} users={users} />
      </div>
    </div>
  );
}

import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import { forOrg } from '@/lib/tenant-db';
import { permissions } from '@/lib/permissions';
import { Role } from '@prisma/client';
import { donorDisplayName } from '@/lib/format';
import GrantForm from '@/components/grants/GrantForm';

export default async function NewGrantPage() {
  const session = await auth();
  if (!permissions.canEditDonors(session!.user.role as Role)) {
    redirect('/grants');
  }

  const db = forOrg(session!.user.organizationId);
  const [orgDonors, users] = await Promise.all([
    db.donor.findMany({
      where: { donorType: { in: ['ORGANIZATION', 'FOUNDATION', 'CORPORATION'] } },
      select: { id: true, firstName: true, lastName: true, organizationName: true },
      orderBy: { organizationName: 'asc' },
    }),
    db.user.findMany({
      where: { isActive: true },
      select: { id: true, name: true, email: true },
      orderBy: { name: 'asc' },
    }),
  ]);

  const funders = orgDonors.map((d) => ({ id: d.id, name: donorDisplayName(d) }));

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-extrabold text-gray-900">New grant opportunity</h1>
      <p className="mt-1 text-sm text-gray-600">Track a grant application from research through decision.</p>

      <div className="mt-6">
        <GrantForm funders={funders} users={users} />
      </div>
    </div>
  );
}

import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import { forOrg } from '@/lib/tenant-db';
import { permissions } from '@/lib/permissions';
import { Role } from '@prisma/client';
import DonorForm from '@/components/donors/DonorForm';

export default async function NewDonorPage() {
  const session = await auth();
  if (!permissions.canEditDonors(session!.user.role as Role)) {
    redirect('/donors');
  }

  const db = forOrg(session!.user.organizationId);
  const users = await db.user.findMany({
    where: { isActive: true },
    select: { id: true, name: true, email: true },
    orderBy: { name: 'asc' },
  });

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-extrabold text-gray-900">New donor</h1>
      <p className="mt-1 text-sm text-gray-600">Add a donor record to your organization.</p>

      <div className="mt-6">
        <DonorForm users={users} />
      </div>
    </div>
  );
}

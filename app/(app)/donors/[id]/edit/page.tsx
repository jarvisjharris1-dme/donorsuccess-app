import { notFound, redirect } from 'next/navigation';
import { auth } from '@/auth';
import { forOrg } from '@/lib/tenant-db';
import { permissions } from '@/lib/permissions';
import { Role } from '@prisma/client';
import DonorForm from '@/components/donors/DonorForm';

export default async function EditDonorPage({ params }: { params: { id: string } }) {
  const session = await auth();
  if (!permissions.canEditDonors(session!.user.role as Role)) {
    redirect(`/donors/${params.id}`);
  }

  const db = forOrg(session!.user.organizationId);

  const [donor, users] = await Promise.all([
    db.donor.findUnique({ where: { id: params.id } }),
    db.user.findMany({
      where: { isActive: true },
      select: { id: true, name: true, email: true },
      orderBy: { name: 'asc' },
    }),
  ]);

  if (!donor) notFound();

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-extrabold text-gray-900">Edit donor</h1>
      <p className="mt-1 text-sm text-gray-600">Update this donor&rsquo;s record.</p>

      <div className="mt-6">
        <DonorForm donor={donor} users={users} />
      </div>
    </div>
  );
}

import { notFound, redirect } from 'next/navigation';
import { auth } from '@/auth';
import { forOrg } from '@/lib/tenant-db';
import { permissions } from '@/lib/permissions';
import { Role } from '@prisma/client';
import { donorDisplayName } from '@/lib/format';
import GrantForm from '@/components/grants/GrantForm';

function toDateInputValue(date: Date | null): string | null {
  if (!date) return null;
  return date.toISOString().slice(0, 10);
}

export default async function EditGrantPage({ params }: { params: { id: string } }) {
  const session = await auth();
  if (!permissions.canEditDonors(session!.user.role as Role)) {
    redirect(`/grants/${params.id}`);
  }

  const db = forOrg(session!.user.organizationId);
  const [grant, orgDonors, users] = await Promise.all([
    db.grantOpportunity.findUnique({ where: { id: params.id } }),
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

  if (!grant) notFound();

  const funders = orgDonors.map((d) => ({ id: d.id, name: donorDisplayName(d) }));

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-extrabold text-gray-900">Edit grant opportunity</h1>
      <p className="mt-1 text-sm text-gray-600">Update this grant&rsquo;s details.</p>

      <div className="mt-6">
        <GrantForm
          grant={{
            id: grant.id,
            donorId: grant.donorId,
            name: grant.name,
            programName: grant.programName,
            askAmount: grant.askAmount.toString(),
            applicationDeadline: toDateInputValue(grant.applicationDeadline),
            decisionExpectedDate: toDateInputValue(grant.decisionExpectedDate),
            notes: grant.notes,
            grantWriterId: grant.grantWriterId,
          }}
          funders={funders}
          users={users}
        />
      </div>
    </div>
  );
}

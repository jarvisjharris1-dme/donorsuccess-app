import { notFound, redirect } from 'next/navigation';
import { auth } from '@/auth';
import { forOrg } from '@/lib/tenant-db';
import { permissions } from '@/lib/permissions';
import { Role } from '@prisma/client';
import PlanForm from '@/components/plans/PlanForm';

export default async function EditPlanPage({
  params,
}: {
  params: { id: string; planId: string };
}) {
  const session = await auth();
  if (!permissions.canEditDonors(session!.user.role as Role)) {
    redirect(`/donors/${params.id}/plan/${params.planId}`);
  }

  const db = forOrg(session!.user.organizationId);

  const [plan, users] = await Promise.all([
    db.donorSuccessPlan.findUnique({ where: { id: params.planId } }),
    db.user.findMany({
      where: { isActive: true },
      select: { id: true, name: true, email: true },
      orderBy: { name: 'asc' },
    }),
  ]);

  if (!plan || plan.donorId !== params.id) notFound();

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-extrabold text-gray-900">Edit Success Plan</h1>
      <p className="mt-1 text-sm text-gray-600">Update the strategy and targets for this plan.</p>

      <div className="mt-6">
        <PlanForm
          donorId={params.id}
          users={users}
          plan={{
            ...plan,
            targetAskAmount: plan.targetAskAmount?.toString() ?? null,
          }}
        />
      </div>
    </div>
  );
}

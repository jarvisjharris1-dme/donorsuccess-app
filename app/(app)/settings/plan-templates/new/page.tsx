import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import { permissions } from '@/lib/permissions';
import { Role } from '@prisma/client';
import PlanTemplateForm from '@/components/settings/PlanTemplateForm';

export default async function NewPlanTemplatePage() {
  const session = await auth();
  if (!permissions.canManageOrgSettings(session!.user.role as Role)) {
    redirect('/settings/plan-templates');
  }

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-extrabold text-gray-900">New plan template</h1>
      <p className="mt-1 text-sm text-gray-600">
        Build a reusable set of milestones for a common kind of donor plan.
      </p>

      <div className="mt-6">
        <PlanTemplateForm />
      </div>
    </div>
  );
}

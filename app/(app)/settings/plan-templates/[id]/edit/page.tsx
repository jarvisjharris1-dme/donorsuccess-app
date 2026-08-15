import { notFound, redirect } from 'next/navigation';
import { auth } from '@/auth';
import { forOrg } from '@/lib/tenant-db';
import { permissions } from '@/lib/permissions';
import { Role } from '@prisma/client';
import PlanTemplateForm from '@/components/settings/PlanTemplateForm';

export default async function EditPlanTemplatePage({ params }: { params: { id: string } }) {
  const session = await auth();
  if (!permissions.canManageOrgSettings(session!.user.role as Role)) {
    redirect('/settings/plan-templates');
  }

  const db = forOrg(session!.user.organizationId);
  const template = await db.planTemplate.findUnique({
    where: { id: params.id },
    include: { milestoneTemplates: { orderBy: { sortOrder: 'asc' } } },
  });

  if (!template) notFound();

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-extrabold text-gray-900">Edit plan template</h1>
      <p className="mt-1 text-sm text-gray-600">Update this template&rsquo;s milestones or targeting.</p>

      <div className="mt-6">
        <PlanTemplateForm
          template={{
            id: template.id,
            name: template.name,
            description: template.description,
            planType: template.planType,
            milestones: template.milestoneTemplates.map((m) => ({
              title: m.title,
              category: m.category,
              priority: m.priority,
              notes: m.notes ?? undefined,
              dayOffset: m.dayOffset,
            })),
          }}
        />
      </div>
    </div>
  );
}

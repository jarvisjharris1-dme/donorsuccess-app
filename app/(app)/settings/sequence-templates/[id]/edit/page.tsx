import { notFound, redirect } from 'next/navigation';
import { auth } from '@/auth';
import { forOrg } from '@/lib/tenant-db';
import { permissions } from '@/lib/permissions';
import { Role } from '@prisma/client';
import SequenceTemplateForm from '@/components/settings/SequenceTemplateForm';

export default async function EditSequenceTemplatePage({ params }: { params: { id: string } }) {
  const session = await auth();
  if (!permissions.canManageOrgSettings(session!.user.role as Role)) {
    redirect('/settings/sequence-templates');
  }

  const db = forOrg(session!.user.organizationId);
  const [template, emailTemplates] = await Promise.all([
    db.sequenceTemplate.findUnique({
      where: { id: params.id },
      include: { steps: { orderBy: { sortOrder: 'asc' } } },
    }),
    db.emailTemplate.findMany({
      select: { id: true, name: true },
      orderBy: { name: 'asc' },
    }),
  ]);

  if (!template) notFound();

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-extrabold text-gray-900">Edit sequence</h1>
      <p className="mt-1 text-sm text-gray-600">Update this sequence&rsquo;s steps or targeting.</p>

      <div className="mt-6">
        <SequenceTemplateForm
          template={{
            id: template.id,
            name: template.name,
            description: template.description,
            suggestedForRisk: template.suggestedForRisk,
            steps: template.steps.map((s) => ({
              emailTemplateId: s.emailTemplateId,
              dayOffset: s.dayOffset,
            })),
          }}
          emailTemplates={emailTemplates}
        />
      </div>
    </div>
  );
}

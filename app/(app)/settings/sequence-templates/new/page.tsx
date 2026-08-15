import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import { forOrg } from '@/lib/tenant-db';
import { permissions } from '@/lib/permissions';
import { Role } from '@prisma/client';
import SequenceTemplateForm from '@/components/settings/SequenceTemplateForm';

export default async function NewSequenceTemplatePage() {
  const session = await auth();
  if (!permissions.canManageOrgSettings(session!.user.role as Role)) {
    redirect('/settings/sequence-templates');
  }

  const db = forOrg(session!.user.organizationId);
  const emailTemplates = await db.emailTemplate.findMany({
    select: { id: true, name: true },
    orderBy: { name: 'asc' },
  });

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-extrabold text-gray-900">New sequence</h1>
      <p className="mt-1 text-sm text-gray-600">
        Build a reusable, ordered set of email touchpoints for donor stewardship.
      </p>

      <div className="mt-6">
        <SequenceTemplateForm emailTemplates={emailTemplates} />
      </div>
    </div>
  );
}

import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { auth } from '@/auth';
import { forOrg } from '@/lib/tenant-db';
import EmailTemplateForm from '@/components/settings/EmailTemplateForm';

export default async function EditEmailTemplatePage({ params }: { params: { id: string } }) {
  const session = await auth();
  const db = forOrg(session!.user.organizationId);

  const [template, campaigns] = await Promise.all([
    db.emailTemplate.findUnique({ where: { id: params.id } }),
    db.campaign.findMany({ orderBy: { name: 'asc' }, select: { id: true, name: true } }),
  ]);

  if (!template) notFound();

  return (
    <div className="max-w-2xl">
      <Link
        href="/settings/email-templates"
        className="flex items-center gap-1.5 text-[13px] font-semibold text-gray-600 hover:text-gray-900"
      >
        <ArrowLeft size={14} />
        Email templates
      </Link>

      <h1 className="mt-2 text-2xl font-extrabold text-gray-900">Edit template</h1>

      <div className="mt-6 rounded-[16px] border border-gray-200 bg-white p-6">
        <EmailTemplateForm
          template={{
            id: template.id,
            name: template.name,
            subject: template.subject,
            body: template.body,
            suggestedForRisk: template.suggestedForRisk,
            campaignId: template.campaignId,
          }}
          campaigns={campaigns}
        />
      </div>
    </div>
  );
}

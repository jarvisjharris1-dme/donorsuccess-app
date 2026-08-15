import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { auth } from '@/auth';
import { forOrg } from '@/lib/tenant-db';
import EmailTemplateForm from '@/components/settings/EmailTemplateForm';

export default async function NewEmailTemplatePage() {
  const session = await auth();
  const db = forOrg(session!.user.organizationId);
  const campaigns = await db.campaign.findMany({
    orderBy: { name: 'asc' },
    select: { id: true, name: true },
  });

  return (
    <div className="max-w-2xl">
      <Link
        href="/settings/email-templates"
        className="flex items-center gap-1.5 text-[13px] font-semibold text-gray-600 hover:text-gray-900"
      >
        <ArrowLeft size={14} />
        Email templates
      </Link>

      <h1 className="mt-2 text-2xl font-extrabold text-gray-900">New template</h1>

      <div className="mt-6 rounded-[16px] border border-gray-200 bg-white p-6">
        <EmailTemplateForm campaigns={campaigns} />
      </div>
    </div>
  );
}

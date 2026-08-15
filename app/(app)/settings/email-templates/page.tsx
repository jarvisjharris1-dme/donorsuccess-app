import Link from 'next/link';
import { ArrowLeft, Plus } from 'lucide-react';
import { auth } from '@/auth';
import { forOrg } from '@/lib/tenant-db';
import DeleteEmailTemplateButton from '@/components/settings/DeleteEmailTemplateButton';

const RISK_LABELS: Record<string, string> = {
  LOW: 'Low risk',
  MEDIUM: 'Medium risk',
  HIGH: 'High risk',
  CRITICAL: 'Critical risk',
};

export default async function EmailTemplatesPage() {
  const session = await auth();
  const db = forOrg(session!.user.organizationId);

  const templates: {
    id: string;
    name: string;
    subject: string;
    suggestedForRisk: string | null;
    campaign: { name: string } | null;
  }[] = await db.emailTemplate.findMany({
    orderBy: { name: 'asc' },
    include: { campaign: { select: { name: true } } },
  });

  return (
    <div className="max-w-3xl">
      <Link
        href="/settings"
        className="flex items-center gap-1.5 text-[13px] font-semibold text-gray-600 hover:text-gray-900"
      >
        <ArrowLeft size={14} />
        Settings
      </Link>

      <div className="mt-2 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-gray-900">Email templates</h1>
          <p className="mt-1 text-sm text-gray-600">
            Shared across your team. Suggested templates surface first when composing an email
            for a donor, based on their retention risk.
          </p>
        </div>
        <Link
          href="/settings/email-templates/new"
          className="flex items-center gap-2 rounded-xl bg-evergreen px-5 py-3 text-[14px] font-semibold text-white transition-all hover:-translate-y-0.5 hover:bg-[#0d685f]"
        >
          <Plus size={16} />
          New Template
        </Link>
      </div>

      <div className="mt-6 flex flex-col gap-3">
        {templates.length === 0 && (
          <div className="rounded-[16px] border border-gray-200 bg-white p-8 text-center text-sm text-gray-600">
            No templates yet — create one to get started.
          </div>
        )}
        {templates.map((t) => (
          <div
            key={t.id}
            className="flex items-center justify-between rounded-[16px] border border-gray-200 bg-white p-5"
          >
            <div className="min-w-0">
              <div className="font-semibold text-gray-900">{t.name}</div>
              <div className="mt-0.5 truncate text-sm text-gray-600">{t.subject}</div>
              <div className="mt-2 flex gap-2">
                {t.suggestedForRisk && (
                  <span className="rounded-full bg-warning/10 px-2.5 py-1 text-[11px] font-semibold text-warning">
                    {RISK_LABELS[t.suggestedForRisk]}
                  </span>
                )}
                {t.campaign && (
                  <span className="rounded-full bg-sky/10 px-2.5 py-1 text-[11px] font-semibold text-sky">
                    {t.campaign.name}
                  </span>
                )}
              </div>
            </div>
            <div className="flex flex-shrink-0 items-center gap-4">
              <Link
                href={`/settings/email-templates/${t.id}/edit`}
                className="text-[12.5px] font-semibold text-evergreen hover:text-[#0d685f]"
              >
                Edit
              </Link>
              <DeleteEmailTemplateButton id={t.id} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

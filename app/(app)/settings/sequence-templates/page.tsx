import Link from 'next/link';
import { ArrowLeft, Plus } from 'lucide-react';
import { auth } from '@/auth';
import { forOrg } from '@/lib/tenant-db';
import DeleteSequenceTemplateButton from '@/components/settings/DeleteSequenceTemplateButton';

const RISK_LABELS: Record<string, string> = {
  LOW: 'Low risk',
  MEDIUM: 'Medium risk',
  HIGH: 'High risk',
  CRITICAL: 'Critical risk',
};

export default async function SequenceTemplatesPage() {
  const session = await auth();
  const db = forOrg(session!.user.organizationId);

  const templates = await db.sequenceTemplate.findMany({
    orderBy: { name: 'asc' },
    include: { _count: { select: { steps: true, enrollments: true } } },
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
          <h1 className="text-2xl font-extrabold text-gray-900">Success sequences</h1>
          <p className="mt-1 text-sm text-gray-600">
            Reusable, multi-step stewardship playbooks. Every step still requires a fundraiser to
            click Send — nothing here contacts a donor automatically.
          </p>
        </div>
        <Link
          href="/settings/sequence-templates/new"
          className="flex items-center gap-2 rounded-xl bg-evergreen px-5 py-3 text-[14px] font-semibold text-white transition-all hover:-translate-y-0.5 hover:bg-[#0d685f]"
        >
          <Plus size={16} />
          New Sequence
        </Link>
      </div>

      <div className="mt-6 flex flex-col gap-3">
        {templates.length === 0 && (
          <div className="rounded-[16px] border border-gray-200 bg-white p-8 text-center text-sm text-gray-600">
            No sequences yet — create one to get started.
          </div>
        )}
        {templates.map((t) => (
          <div
            key={t.id}
            className="flex items-center justify-between rounded-[16px] border border-gray-200 bg-white p-5"
          >
            <div className="min-w-0">
              <div className="font-semibold text-gray-900">{t.name}</div>
              {t.description && <div className="mt-0.5 truncate text-sm text-gray-600">{t.description}</div>}
              <div className="mt-2 flex gap-2">
                <span className="rounded-full bg-gray-100 px-2.5 py-1 text-[11px] font-semibold text-gray-600">
                  {t._count.steps} step{t._count.steps === 1 ? '' : 's'}
                </span>
                {t.suggestedForRisk && (
                  <span className="rounded-full bg-warning/10 px-2.5 py-1 text-[11px] font-semibold text-warning">
                    Suggested at {RISK_LABELS[t.suggestedForRisk]}
                  </span>
                )}
                {t._count.enrollments > 0 && (
                  <span className="rounded-full bg-sky/10 px-2.5 py-1 text-[11px] font-semibold text-sky">
                    {t._count.enrollments} enrolled
                  </span>
                )}
              </div>
            </div>
            <div className="flex flex-shrink-0 items-center gap-4">
              <Link
                href={`/settings/sequence-templates/${t.id}/edit`}
                className="text-[12.5px] font-semibold text-evergreen hover:text-[#0d685f]"
              >
                Edit
              </Link>
              <DeleteSequenceTemplateButton id={t.id} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

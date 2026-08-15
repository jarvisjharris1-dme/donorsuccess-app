import Link from 'next/link';
import { ArrowLeft, Plus } from 'lucide-react';
import { auth } from '@/auth';
import { forOrg } from '@/lib/tenant-db';
import { PLAN_TYPE_LABELS } from '@/lib/success-plans';
import DeletePlanTemplateButton from '@/components/settings/DeletePlanTemplateButton';

export default async function PlanTemplatesPage() {
  const session = await auth();
  const db = forOrg(session!.user.organizationId);

  const templates = await db.planTemplate.findMany({
    orderBy: { name: 'asc' },
    include: { _count: { select: { milestoneTemplates: true } } },
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
          <h1 className="text-2xl font-extrabold text-gray-900">Success Plan templates</h1>
          <p className="mt-1 text-sm text-gray-600">
            Reusable milestone structures a fundraiser can apply to a new plan instead of building
            one from scratch.
          </p>
        </div>
        <Link
          href="/settings/plan-templates/new"
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
              {t.description && <div className="mt-0.5 truncate text-sm text-gray-600">{t.description}</div>}
              <div className="mt-2 flex gap-2">
                <span className="rounded-full bg-gray-100 px-2.5 py-1 text-[11px] font-semibold text-gray-600">
                  {t._count.milestoneTemplates} milestone{t._count.milestoneTemplates === 1 ? '' : 's'}
                </span>
                {t.planType && (
                  <span className="rounded-full bg-evergreen/10 px-2.5 py-1 text-[11px] font-semibold text-evergreen">
                    {PLAN_TYPE_LABELS[t.planType as keyof typeof PLAN_TYPE_LABELS]}
                  </span>
                )}
              </div>
            </div>
            <div className="flex flex-shrink-0 items-center gap-4">
              <Link
                href={`/settings/plan-templates/${t.id}/edit`}
                className="text-[12.5px] font-semibold text-evergreen hover:text-[#0d685f]"
              >
                Edit
              </Link>
              <DeletePlanTemplateButton id={t.id} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

import Link from 'next/link';
import { ArrowLeft, Search } from 'lucide-react';
import { auth } from '@/auth';
import { forOrg } from '@/lib/tenant-db';
import { GRANT_STAGE_LABELS, GRANT_STAGE_STYLES } from '@/lib/grants';
import { donorDisplayName, formatCurrency, formatDate } from '@/lib/format';
import DownloadCsvButton from '@/components/reports/DownloadCsvButton';

export default async function GrantComplianceReportPage({
  searchParams,
}: {
  searchParams: { grantId?: string };
}) {
  const session = await auth();
  const db = forOrg(session!.user.organizationId);

  const allOpportunities = await db.grantOpportunity.findMany({
    orderBy: { name: 'asc' },
    select: {
      id: true,
      name: true,
      donor: { select: { firstName: true, lastName: true, organizationName: true } },
    },
  });

  const selectedId = searchParams.grantId || allOpportunities[0]?.id;

  const opportunity = selectedId
    ? await db.grantOpportunity.findUnique({
        where: { id: selectedId },
        include: {
          donor: { select: { firstName: true, lastName: true, organizationName: true } },
          grantWriter: { select: { name: true, email: true } },
          requirements: { orderBy: { sortOrder: 'asc' } },
          documents: { select: { id: true, fileName: true, requirementId: true, milestoneId: true } },
          grant: {
            include: {
              complianceOwner: { select: { name: true, email: true } },
              milestones: { orderBy: { sortOrder: 'asc' } },
              gifts: { orderBy: { date: 'asc' } },
            },
          },
        },
      })
    : null;

  const csvRows = opportunity
    ? [
        ...opportunity.requirements.map((r) => [
          'Requirement',
          r.name,
          r.isComplete ? 'Complete' : 'Incomplete',
          r.dueDate ? formatDate(r.dueDate.toISOString()) : '',
        ]),
        ...(opportunity.grant?.milestones.map((m) => [
          'Compliance Milestone',
          m.name,
          m.isComplete ? 'Complete' : 'Incomplete',
          formatDate(m.dueDate.toISOString()),
        ]) ?? []),
      ]
    : [];

  return (
    <div className="max-w-3xl">
      <Link
        href="/reports"
        className="flex items-center gap-1.5 text-[13px] font-semibold text-gray-600 hover:text-gray-900"
      >
        <ArrowLeft size={14} />
        Reports
      </Link>

      <h1 className="mt-2 text-2xl font-extrabold text-gray-900">Grant Compliance Report</h1>
      <p className="mt-1 text-sm text-gray-600">
        Full requirements and compliance status for one grant at a time.
      </p>

      <form method="get" className="mt-5 flex flex-wrap items-center gap-3">
        <select
          name="grantId"
          defaultValue={selectedId ?? ''}
          className="w-full max-w-md rounded-[10px] border border-gray-200 px-3.5 py-3 text-sm focus:border-teal focus:outline-none focus:ring-2 focus:ring-teal/20 sm:w-auto"
        >
          {allOpportunities.map((o) => (
            <option key={o.id} value={o.id}>
              {donorDisplayName(o.donor)} — {o.name}
            </option>
          ))}
        </select>
        <button
          type="submit"
          className="flex items-center gap-1.5 rounded-[10px] bg-evergreen px-4 py-3 text-[13.5px] font-semibold text-white transition-colors hover:bg-[#0d685f]"
        >
          <Search size={14} />
          View report
        </button>
      </form>

      {!opportunity && (
        <p className="mt-8 rounded-[16px] border border-dashed border-gray-200 p-8 text-center text-sm text-gray-600">
          No grant opportunities yet.
        </p>
      )}

      {opportunity && (
        <>
          <div className="mt-6 flex items-start justify-between">
            <div>
              <p className="text-[13px] font-semibold text-evergreen">{donorDisplayName(opportunity.donor)}</p>
              <h2 className="mt-0.5 text-xl font-bold text-gray-900">{opportunity.name}</h2>
              <span
                className={`mt-2 inline-block rounded-full px-2.5 py-1 text-[11px] font-semibold ${GRANT_STAGE_STYLES[opportunity.stage as keyof typeof GRANT_STAGE_STYLES]}`}
              >
                {GRANT_STAGE_LABELS[opportunity.stage as keyof typeof GRANT_STAGE_LABELS]}
              </span>
            </div>
            <DownloadCsvButton
              filename={`grant-compliance-${opportunity.id}.csv`}
              headers={['Type', 'Name', 'Status', 'Due Date']}
              rows={csvRows}
            />
          </div>

          <div className="mt-6 grid grid-cols-2 gap-4">
            <div className="rounded-[16px] border border-gray-200 bg-white p-4">
              <p className="text-[12px] text-gray-500">Grant writer</p>
              <p className="mt-1 text-sm font-semibold text-gray-900">
                {opportunity.grantWriter.name ?? opportunity.grantWriter.email}
              </p>
            </div>
            <div className="rounded-[16px] border border-gray-200 bg-white p-4">
              <p className="text-[12px] text-gray-500">
                {opportunity.grant ? 'Award amount' : 'Ask amount'}
              </p>
              <p className="mt-1 text-sm font-semibold text-gray-900">
                {formatCurrency((opportunity.grant?.awardAmount ?? opportunity.askAmount).toString())}
              </p>
            </div>
          </div>

          <div className="mt-6 rounded-[16px] border border-gray-200 bg-white p-6">
            <h3 className="text-[14px] font-bold text-gray-900">Requirements (pre-award)</h3>
            <div className="mt-3 flex flex-col divide-y divide-gray-50">
              {opportunity.requirements.length === 0 && (
                <p className="py-2 text-sm text-gray-600">No requirements tracked.</p>
              )}
              {opportunity.requirements.map((r) => (
                <div key={r.id} className="flex items-center justify-between py-2 text-sm">
                  <span className="text-gray-900">{r.name}</span>
                  <span className={r.isComplete ? 'text-success' : 'text-gray-500'}>
                    {r.isComplete ? 'Complete' : 'Incomplete'}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {opportunity.grant ? (
            <>
              <div className="mt-6 rounded-[16px] border border-gray-200 bg-white p-6">
                <div className="flex items-center justify-between">
                  <h3 className="text-[14px] font-bold text-gray-900">Compliance plan (post-award)</h3>
                  <span className="text-[12px] text-gray-500">
                    Compliance owner: {opportunity.grant.complianceOwner.name ?? opportunity.grant.complianceOwner.email}
                  </span>
                </div>
                <div className="mt-3 flex flex-col divide-y divide-gray-50">
                  {opportunity.grant.milestones.length === 0 && (
                    <p className="py-2 text-sm text-gray-600">No compliance milestones tracked.</p>
                  )}
                  {opportunity.grant.milestones.map((m) => {
                    const overdue = !m.isComplete && m.dueDate.getTime() < Date.now();
                    return (
                      <div key={m.id} className="flex items-center justify-between py-2 text-sm">
                        <div>
                          <span className="text-gray-900">{m.name}</span>
                          <span className="ml-2 text-xs text-gray-500">Due {formatDate(m.dueDate.toISOString())}</span>
                        </div>
                        <span
                          className={
                            m.isComplete ? 'text-success' : overdue ? 'font-semibold text-error' : 'text-gray-500'
                          }
                        >
                          {m.isComplete ? 'Complete' : overdue ? 'Overdue' : 'Incomplete'}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="mt-6 rounded-[16px] border border-gray-200 bg-white p-6">
                <h3 className="text-[14px] font-bold text-gray-900">Disbursements</h3>
                <div className="mt-3 flex flex-col divide-y divide-gray-50">
                  {opportunity.grant.gifts.length === 0 && (
                    <p className="py-2 text-sm text-gray-600">No disbursements recorded.</p>
                  )}
                  {opportunity.grant.gifts.map((g) => (
                    <div key={g.id} className="flex items-center justify-between py-2 text-sm">
                      <span className="text-gray-700">{formatDate(g.date.toISOString())}</span>
                      <span className="font-semibold text-gray-900">{formatCurrency(g.amount.toString())}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="mt-6 rounded-[16px] border border-gray-200 bg-white p-6">
                <h3 className="text-[14px] font-bold text-gray-900">
                  Documents ({opportunity.documents.length})
                </h3>
                <div className="mt-3 flex flex-col divide-y divide-gray-50">
                  {opportunity.documents.length === 0 && (
                    <p className="py-2 text-sm text-gray-600">No documents attached.</p>
                  )}
                  {opportunity.documents.map((d) => (
                    <div key={d.id} className="flex items-center justify-between py-2 text-sm">
                      <span className="text-gray-700">{d.fileName}</span>
                      <a
                        href={`/api/grants/documents/${d.id}/download`}
                        className="text-[12.5px] font-semibold text-evergreen hover:text-[#0d685f]"
                      >
                        Download
                      </a>
                    </div>
                  ))}
                </div>
              </div>
            </>
          ) : (
            <div className="mt-6 rounded-[16px] border border-dashed border-gray-200 p-6 text-center text-sm text-gray-600">
              This grant hasn&rsquo;t been awarded and converted yet — compliance tracking begins once it is.
            </div>
          )}

          <div className="mt-6">
            <Link href={`/grants/${opportunity.id}`} className="text-[13px] font-semibold text-evergreen hover:text-[#0d685f]">
              Open full grant record →
            </Link>
          </div>
        </>
      )}
    </div>
  );
}

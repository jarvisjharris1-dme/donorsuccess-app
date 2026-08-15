import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { auth } from '@/auth';
import { forOrg } from '@/lib/tenant-db';
import { GRANT_STAGE_LABELS, GRANT_STAGE_STYLES, GRANT_STAGES } from '@/lib/grants';
import { donorDisplayName, formatCurrency } from '@/lib/format';
import DownloadCsvButton from '@/components/reports/DownloadCsvButton';

export default async function GrantsPortfolioReportPage() {
  const session = await auth();
  const db = forOrg(session!.user.organizationId);

  const opportunities = await db.grantOpportunity.findMany({
    orderBy: { createdAt: 'desc' },
    include: {
      donor: { select: { firstName: true, lastName: true, organizationName: true } },
      grantWriter: { select: { name: true, email: true } },
      requirements: { select: { isComplete: true } },
      grant: {
        include: {
          complianceOwner: { select: { name: true, email: true } },
          milestones: { select: { isComplete: true, dueDate: true } },
          gifts: { select: { amount: true } },
        },
      },
    },
  });

  const totalAwarded = opportunities.reduce(
    (sum, o) => sum + (o.grant ? Number(o.grant.awardAmount) : 0),
    0,
  );
  const totalDisbursed = opportunities.reduce(
    (sum, o) => sum + (o.grant?.gifts.reduce((s, g) => s + Number(g.amount), 0) ?? 0),
    0,
  );

  const stageCounts = GRANT_STAGES.map((stage) => {
    const inStage = opportunities.filter((o) => o.stage === stage);
    return {
      stage,
      count: inStage.length,
      totalAsk: inStage.reduce((sum, o) => sum + Number(o.askAmount), 0),
    };
  });

  // Only compliance milestones carry real financial/reporting stakes —
  // pre-award requirements don't have the same "overdue" urgency this
  // summary is meant to surface.
  const now = Date.now();
  let overdueCount = 0;
  let dueSoonCount = 0;
  for (const o of opportunities) {
    if (!o.grant) continue;
    for (const m of o.grant.milestones) {
      if (m.isComplete) continue;
      const daysUntil = (m.dueDate.getTime() - now) / (24 * 60 * 60 * 1000);
      if (daysUntil < 0) overdueCount += 1;
      else if (daysUntil <= 14) dueSoonCount += 1;
    }
  }

  const csvRows = opportunities.map((o) => {
    const complianceTotal = o.grant?.milestones.length ?? 0;
    const complianceDone = o.grant?.milestones.filter((m) => m.isComplete).length ?? 0;
    return [
      donorDisplayName(o.donor),
      o.name,
      GRANT_STAGE_LABELS[o.stage as keyof typeof GRANT_STAGE_LABELS],
      o.askAmount.toString(),
      o.grant ? o.grant.awardAmount.toString() : '',
      o.grantWriter.name ?? o.grantWriter.email,
      o.grant?.complianceOwner.name ?? o.grant?.complianceOwner.email ?? '',
      complianceTotal > 0 ? `${complianceDone} of ${complianceTotal}` : '',
    ];
  });

  return (
    <div className="max-w-5xl">
      <Link
        href="/reports"
        className="flex items-center gap-1.5 text-[13px] font-semibold text-gray-600 hover:text-gray-900"
      >
        <ArrowLeft size={14} />
        Reports
      </Link>

      <div className="mt-2 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-gray-900">Grants Portfolio</h1>
          <p className="mt-1 text-sm text-gray-600">
            Every grant opportunity across the organization, from research through compliance.
          </p>
        </div>
        <DownloadCsvButton
          filename="grants-portfolio.csv"
          headers={[
            'Funder',
            'Grant Name',
            'Stage',
            'Ask Amount',
            'Award Amount',
            'Grant Writer',
            'Compliance Owner',
            'Compliance Progress',
          ]}
          rows={csvRows}
        />
      </div>

      <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div className="rounded-[16px] border border-gray-200 bg-white p-4">
          <p className="text-[12px] text-gray-500">Total awarded</p>
          <p className="mt-1 text-[20px] font-bold text-gray-900">{formatCurrency(totalAwarded.toString())}</p>
        </div>
        <div className="rounded-[16px] border border-gray-200 bg-white p-4">
          <p className="text-[12px] text-gray-500">Total disbursed</p>
          <p className="mt-1 text-[20px] font-bold text-gray-900">{formatCurrency(totalDisbursed.toString())}</p>
        </div>
        <div className="rounded-[16px] border border-gray-200 bg-white p-4">
          <p className="text-[12px] text-gray-500">Overdue milestones</p>
          <p className="mt-1 text-[20px] font-bold text-error">{overdueCount}</p>
        </div>
        <div className="rounded-[16px] border border-gray-200 bg-white p-4">
          <p className="text-[12px] text-gray-500">Due within 14 days</p>
          <p className="mt-1 text-[20px] font-bold text-warning">{dueSoonCount}</p>
        </div>
      </div>

      <div className="mt-6 rounded-[16px] border border-gray-200 bg-white p-6">
        <h2 className="text-[15px] font-bold text-gray-900">By stage</h2>
        <div className="mt-3 flex flex-col divide-y divide-gray-50">
          {stageCounts.map((s) => (
            <div key={s.stage} className="flex items-center justify-between py-2.5">
              <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${GRANT_STAGE_STYLES[s.stage]}`}>
                {GRANT_STAGE_LABELS[s.stage]}
              </span>
              <span className="text-sm text-gray-600">{s.count} grants</span>
              <span className="text-sm font-semibold text-gray-900">{formatCurrency(s.totalAsk.toString())}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-6 overflow-hidden rounded-[16px] border border-gray-200 bg-white">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-gray-100 text-xs font-semibold uppercase tracking-wide text-gray-600">
              <th className="px-5 py-3.5">Funder</th>
              <th className="px-5 py-3.5">Stage</th>
              <th className="px-5 py-3.5">Amount</th>
              <th className="px-5 py-3.5">Grant Writer</th>
              <th className="px-5 py-3.5">Compliance Owner</th>
              <th className="px-5 py-3.5">Compliance</th>
            </tr>
          </thead>
          <tbody>
            {opportunities.map((o) => {
              const complianceTotal = o.grant?.milestones.length ?? 0;
              const complianceDone = o.grant?.milestones.filter((m) => m.isComplete).length ?? 0;
              return (
                <tr key={o.id} className="border-b border-gray-50 last:border-0">
                  <td className="px-5 py-3">
                    <Link href={`/grants/${o.id}`} className="font-semibold text-evergreen hover:text-[#0d685f]">
                      {donorDisplayName(o.donor)}
                    </Link>
                    <div className="text-xs text-gray-500">{o.name}</div>
                  </td>
                  <td className="px-5 py-3">
                    <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${GRANT_STAGE_STYLES[o.stage as keyof typeof GRANT_STAGE_STYLES]}`}>
                      {GRANT_STAGE_LABELS[o.stage as keyof typeof GRANT_STAGE_LABELS]}
                    </span>
                  </td>
                  <td className="px-5 py-3 font-semibold text-gray-900">
                    {formatCurrency((o.grant?.awardAmount ?? o.askAmount).toString())}
                  </td>
                  <td className="px-5 py-3 text-gray-700">{o.grantWriter.name ?? o.grantWriter.email}</td>
                  <td className="px-5 py-3 text-gray-700">
                    {o.grant?.complianceOwner.name ?? o.grant?.complianceOwner.email ?? '—'}
                  </td>
                  <td className="px-5 py-3 text-gray-700">
                    {complianceTotal > 0 ? `${complianceDone} of ${complianceTotal}` : '—'}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

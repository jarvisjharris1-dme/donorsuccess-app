import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { auth } from '@/auth';
import { forOrg } from '@/lib/tenant-db';
import { formatCurrency, donorDisplayName } from '@/lib/format';
import { ORDERED_STAGES, STAGE_LABELS, OPEN_STAGES, effectiveProbability } from '@/lib/pipeline';
import { OpportunityStage } from '@prisma/client';
import DownloadCsvButton from '@/components/reports/DownloadCsvButton';

export default async function PipelineReportPage() {
  const session = await auth();
  const db = forOrg(session!.user.organizationId);

  const opportunities: {
    id: string;
    name: string;
    stage: OpportunityStage;
    askAmount: unknown;
    probability: number | null;
    donor: { id: string; firstName: string | null; lastName: string | null; organizationName: string | null };
  }[] = await db.opportunity.findMany({
    select: {
      id: true,
      name: true,
      stage: true,
      askAmount: true,
      probability: true,
      donor: { select: { id: true, firstName: true, lastName: true, organizationName: true } },
    },
  });

  const byStage = new Map<OpportunityStage, { count: number; total: number; weighted: number }>();
  for (const stage of ORDERED_STAGES) byStage.set(stage, { count: 0, total: 0, weighted: 0 });

  let openTotal = 0;
  let weightedForecast = 0;

  for (const o of opportunities) {
    const amount = Number(o.askAmount ?? 0);
    const bucket = byStage.get(o.stage)!;
    bucket.count += 1;
    bucket.total += amount;

    if (OPEN_STAGES.includes(o.stage)) {
      openTotal += amount;
      const weighted = amount * (effectiveProbability(o.stage, o.probability) / 100);
      bucket.weighted += weighted;
      weightedForecast += weighted;
    }
  }

  const closedWon = byStage.get(OpportunityStage.CLOSED_WON)!;
  const closedLost = byStage.get(OpportunityStage.CLOSED_LOST)!;
  const totalClosed = closedWon.count + closedLost.count;
  const winRate = totalClosed > 0 ? Math.round((closedWon.count / totalClosed) * 100) : null;

  const csvRows: (string | number)[][] = ORDERED_STAGES.map((stage) => {
    const b = byStage.get(stage)!;
    return [STAGE_LABELS[stage], b.count, b.total.toFixed(2)];
  });

  return (
    <div className="max-w-4xl">
      <Link
        href="/reports"
        className="flex items-center gap-1.5 text-[13px] font-semibold text-gray-600 hover:text-gray-900"
      >
        <ArrowLeft size={14} />
        Reports
      </Link>

      <div className="mt-2 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-gray-900">Major Gifts Pipeline</h1>
          <p className="mt-1 text-sm text-gray-600">Open value, weighted forecast, and win rate by stage.</p>
        </div>
        <DownloadCsvButton
          filename="pipeline-report.csv"
          headers={['Stage', 'Count', 'Total']}
          rows={csvRows}
        />
      </div>

      <div className="mt-6 grid grid-cols-3 gap-4">
        <div className="rounded-[16px] border border-gray-200 bg-white p-5">
          <div className="font-display text-[26px] font-extrabold text-gray-900">
            {formatCurrency(openTotal.toFixed(2))}
          </div>
          <div className="mt-1 text-[13px] font-medium text-gray-600">Open pipeline value</div>
        </div>
        <div className="rounded-[16px] border border-gray-200 bg-white p-5">
          <div className="font-display text-[26px] font-extrabold text-sky">
            {formatCurrency(weightedForecast.toFixed(2))}
          </div>
          <div className="mt-1 text-[13px] font-medium text-gray-600">Weighted forecast</div>
        </div>
        <div className="rounded-[16px] border border-gray-200 bg-white p-5">
          <div className="font-display text-[26px] font-extrabold text-gray-900">
            {winRate !== null ? `${winRate}%` : '—'}
          </div>
          <div className="mt-1 text-[13px] font-medium text-gray-600">
            Win rate {totalClosed > 0 ? `(${totalClosed} closed)` : '(no closed deals yet)'}
          </div>
        </div>
      </div>

      <div className="mt-6 rounded-[16px] border border-gray-200 bg-white p-6">
        <h2 className="text-[15px] font-bold text-gray-900">By stage</h2>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-gray-100 text-xs font-semibold uppercase tracking-wide text-gray-600">
                <th className="px-3 py-2">Stage</th>
                <th className="px-3 py-2">Opportunities</th>
                <th className="px-3 py-2">Total value</th>
                <th className="px-3 py-2">Weighted</th>
              </tr>
            </thead>
            <tbody>
              {ORDERED_STAGES.map((stage) => {
                const b = byStage.get(stage)!;
                return (
                  <tr key={stage} className="border-b border-gray-50 last:border-0">
                    <td className="px-3 py-2 font-medium text-gray-900">{STAGE_LABELS[stage]}</td>
                    <td className="px-3 py-2 text-gray-600">{b.count}</td>
                    <td className="px-3 py-2 text-gray-600">{formatCurrency(b.total.toFixed(2))}</td>
                    <td className="px-3 py-2 text-gray-600">
                      {OPEN_STAGES.includes(stage) ? formatCurrency(b.weighted.toFixed(2)) : '—'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <div className="mt-6 rounded-[16px] border border-gray-200 bg-white p-6">
        <h2 className="text-[15px] font-bold text-gray-900">Open opportunities</h2>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-gray-100 text-xs font-semibold uppercase tracking-wide text-gray-600">
                <th className="px-3 py-2">Opportunity</th>
                <th className="px-3 py-2">Donor</th>
                <th className="px-3 py-2">Stage</th>
                <th className="px-3 py-2">Ask amount</th>
              </tr>
            </thead>
            <tbody>
              {opportunities
                .filter((o) => OPEN_STAGES.includes(o.stage))
                .map((o) => (
                  <tr key={o.id} className="border-b border-gray-50 last:border-0">
                    <td className="px-3 py-2 font-medium">
                      <Link href={`/pipeline/${o.id}`} className="text-evergreen hover:text-[#0d685f]">
                        {o.name}
                      </Link>
                    </td>
                    <td className="px-3 py-2 text-gray-600">
                      <Link href={`/donors/${o.donor.id}`} className="hover:text-evergreen">
                        {donorDisplayName(o.donor)}
                      </Link>
                    </td>
                    <td className="px-3 py-2 text-gray-600">{STAGE_LABELS[o.stage]}</td>
                    <td className="px-3 py-2 text-gray-600">
                      {formatCurrency(o.askAmount ? Number(o.askAmount).toFixed(2) : '0')}
                    </td>
                  </tr>
                ))}
              {opportunities.filter((o) => OPEN_STAGES.includes(o.stage)).length === 0 && (
                <tr>
                  <td colSpan={4} className="px-3 py-6 text-center text-gray-500">
                    No open opportunities.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

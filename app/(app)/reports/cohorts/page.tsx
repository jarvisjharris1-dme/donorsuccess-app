import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { auth } from '@/auth';
import { forOrg } from '@/lib/tenant-db';
import { formatCurrency } from '@/lib/format';
import DownloadCsvButton from '@/components/reports/DownloadCsvButton';

type CohortRow = {
  cohortYear: number;
  cohortSize: number;
  cells: { offset: number; rate: number | null; revenue: number }[];
};

export default async function CohortAnalysisReportPage() {
  const session = await auth();
  const db = forOrg(session!.user.organizationId);

  const [donors, gifts] = await Promise.all([
    db.donor.findMany({
      where: { firstGiftDate: { not: null } },
      select: { id: true, firstGiftDate: true },
    }),
    db.gift.findMany({ select: { donorId: true, date: true, amount: true } }),
  ]);

  if (donors.length === 0) {
    return (
      <div className="max-w-4xl">
        <Link href="/reports" className="flex items-center gap-1.5 text-[13px] font-semibold text-gray-600 hover:text-gray-900">
          <ArrowLeft size={14} />
          Reports
        </Link>
        <h1 className="mt-2 text-2xl font-extrabold text-gray-900">Cohort Analysis</h1>
        <div className="mt-6 rounded-[16px] border border-gray-200 bg-white p-6">
          <p className="text-sm text-gray-600">Not enough giving history yet to compute cohorts.</p>
        </div>
      </div>
    );
  }

  const donorYearActivity = new Map<string, Map<number, number>>();
  for (const g of gifts) {
    const year = g.date.getFullYear();
    if (!donorYearActivity.has(g.donorId)) donorYearActivity.set(g.donorId, new Map());
    const yearMap = donorYearActivity.get(g.donorId)!;
    yearMap.set(year, (yearMap.get(year) ?? 0) + Number(g.amount));
  }

  const cohorts = new Map<number, string[]>();
  for (const d of donors) {
    const cohortYear = d.firstGiftDate!.getFullYear();
    if (!cohorts.has(cohortYear)) cohorts.set(cohortYear, []);
    cohorts.get(cohortYear)!.push(d.id);
  }

  const currentYear = new Date().getFullYear();
  const cohortYears = Array.from(cohorts.keys()).sort((a, b) => a - b);
  const maxOffset = cohortYears.length > 0 ? currentYear - cohortYears[0] : 0;

  const cohortRows: CohortRow[] = cohortYears.map((cohortYear) => {
    const donorIds = cohorts.get(cohortYear)!;
    const cohortSize = donorIds.length;
    const maxOffsetForCohort = currentYear - cohortYear;

    const cells = [];
    for (let offset = 0; offset <= maxOffset; offset++) {
      if (offset > maxOffsetForCohort) {
        cells.push({ offset, rate: null, revenue: 0 });
        continue;
      }
      const targetYear = cohortYear + offset;
      let activeCount = 0;
      let revenue = 0;
      for (const id of donorIds) {
        const amt = donorYearActivity.get(id)?.get(targetYear);
        if (amt !== undefined) {
          activeCount += 1;
          revenue += amt;
        }
      }
      cells.push({ offset, rate: cohortSize > 0 ? activeCount / cohortSize : 0, revenue });
    }

    return { cohortYear, cohortSize, cells };
  });

  const csvRows: (string | number)[][] = cohortRows.flatMap((row) =>
    row.cells
      .filter((c) => c.rate !== null)
      .map((c) => [row.cohortYear, row.cohortSize, `Year ${c.offset}`, `${Math.round((c.rate ?? 0) * 100)}%`, c.revenue.toFixed(2)]),
  );

  function cellColor(rate: number | null): string {
    if (rate === null) return 'transparent';
    const alpha = 0.08 + rate * 0.72;
    return `rgba(15, 118, 110, ${alpha})`;
  }

  return (
    <div className="max-w-5xl">
      <Link href="/reports" className="flex items-center gap-1.5 text-[13px] font-semibold text-gray-600 hover:text-gray-900">
        <ArrowLeft size={14} />
        Reports
      </Link>

      <div className="mt-2 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-gray-900">Cohort Analysis</h1>
          <p className="mt-1 text-sm text-gray-600">
            Donors grouped by the year of their first gift, tracking what share of each cohort is
            still giving in every year since.
          </p>
        </div>
        <DownloadCsvButton
          filename="cohort-analysis.csv"
          headers={['Cohort Year', 'Cohort Size', 'Year', 'Retention', 'Revenue']}
          rows={csvRows}
        />
      </div>

      <div className="mt-6 overflow-x-auto rounded-[16px] border border-gray-200 bg-white p-4">
        <table className="w-full border-collapse text-left text-sm">
          <thead>
            <tr>
              <th className="whitespace-nowrap px-3 py-2 text-xs font-semibold uppercase tracking-wide text-gray-600">
                Cohort
              </th>
              <th className="whitespace-nowrap px-3 py-2 text-xs font-semibold uppercase tracking-wide text-gray-600">
                Size
              </th>
              {Array.from({ length: maxOffset + 1 }, (_, i) => (
                <th key={i} className="whitespace-nowrap px-3 py-2 text-center text-xs font-semibold uppercase tracking-wide text-gray-600">
                  Year {i}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {cohortRows.map((row) => (
              <tr key={row.cohortYear}>
                <td className="whitespace-nowrap px-3 py-2 font-semibold text-gray-900">{row.cohortYear}</td>
                <td className="whitespace-nowrap px-3 py-2 text-gray-600">{row.cohortSize}</td>
                {row.cells.map((c) => (
                  <td
                    key={c.offset}
                    className="px-3 py-2 text-center text-[13px] font-medium"
                    style={{ backgroundColor: cellColor(c.rate) }}
                    title={c.rate !== null ? formatCurrency(c.revenue.toFixed(2)) : undefined}
                  >
                    {c.rate !== null ? (
                      <span className={c.rate > 0.4 ? 'text-white' : 'text-gray-900'}>
                        {Math.round(c.rate * 100)}%
                      </span>
                    ) : (
                      <span className="text-gray-300">—</span>
                    )}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="mt-3 text-xs text-gray-500">
        Year 0 is always 100% by definition &mdash; it&rsquo;s the cohort&rsquo;s own acquisition year. Hover a cell to
        see that cohort&rsquo;s actual revenue in that year.
      </p>
    </div>
  );
}

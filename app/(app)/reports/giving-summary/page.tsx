import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { auth } from '@/auth';
import { forOrg } from '@/lib/tenant-db';
import { formatCurrency } from '@/lib/format';
import { SEGMENT_LABELS } from '@/lib/segments';
import DownloadCsvButton from '@/components/reports/DownloadCsvButton';

const MONTH_LABELS = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];

export default async function GivingSummaryReportPage() {
  const session = await auth();
  const db = forOrg(session!.user.organizationId);

  const oneYearAgo = new Date();
  oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);

  const gifts: { amount: unknown; date: Date; donor: { segment: string | null } }[] =
    await db.gift.findMany({
      where: { date: { gte: oneYearAgo } },
      select: { amount: true, date: true, donor: { select: { segment: true } } },
    });

  // Build the last 12 calendar months in order, oldest first, keyed by
  // "YYYY-M" so gifts land in the right bucket regardless of year
  // boundary.
  const months: { key: string; label: string; total: number }[] = [];
  const cursor = new Date(oneYearAgo);
  cursor.setDate(1);
  for (let i = 0; i < 12; i++) {
    const key = `${cursor.getFullYear()}-${cursor.getMonth()}`;
    months.push({ key, label: `${MONTH_LABELS[cursor.getMonth()]} ${cursor.getFullYear()}`, total: 0 });
    cursor.setMonth(cursor.getMonth() + 1);
  }
  const monthByKey = new Map(months.map((m) => [m.key, m]));

  const segmentTotals = new Map<string, { count: number; total: number }>();
  let grandTotal = 0;

  for (const g of gifts) {
    const amount = Number(g.amount);
    grandTotal += amount;

    const key = `${g.date.getFullYear()}-${g.date.getMonth()}`;
    const bucket = monthByKey.get(key);
    if (bucket) bucket.total += amount;

    const segmentKey = g.donor.segment ?? 'UNSPECIFIED';
    const seg = segmentTotals.get(segmentKey) ?? { count: 0, total: 0 };
    seg.count += 1;
    seg.total += amount;
    segmentTotals.set(segmentKey, seg);
  }

  const maxMonthTotal = Math.max(1, ...months.map((m) => m.total));

  const csvRows: (string | number)[][] = months.map((m) => [m.label, m.total.toFixed(2)]);

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
          <h1 className="text-2xl font-extrabold text-gray-900">Giving Summary</h1>
          <p className="mt-1 text-sm text-gray-600">Gifts logged over the last 12 months.</p>
        </div>
        <DownloadCsvButton
          filename="giving-summary-report.csv"
          headers={['Month', 'Total']}
          rows={csvRows}
        />
      </div>

      <div className="mt-6 rounded-[16px] border border-gray-200 bg-white p-6">
        <div className="font-display text-[32px] font-extrabold text-gray-900">
          {formatCurrency(grandTotal.toFixed(2))}
        </div>
        <div className="mt-1 text-[13px] font-medium text-gray-600">Total raised, last 12 months</div>

        <div className="mt-6 flex h-40 items-end gap-2">
          {months.map((m) => (
            <Link
              key={m.key}
              href={`/reports/giving-summary/${m.key}`}
              className="group flex flex-1 flex-col items-center gap-1.5"
            >
              <div
                className="w-full rounded-t-md bg-evergreen/80 transition-colors group-hover:bg-evergreen"
                style={{ height: `${Math.max(4, (m.total / maxMonthTotal) * 100)}%` }}
                title={`${m.label}: ${formatCurrency(m.total.toFixed(2))}`}
              />
              <span className="text-[10px] font-medium text-gray-500 group-hover:text-evergreen">
                {m.label.split(' ')[0]}
              </span>
            </Link>
          ))}
        </div>
      </div>

      <div className="mt-6 rounded-[16px] border border-gray-200 bg-white p-6">
        <h2 className="text-[15px] font-bold text-gray-900">By segment</h2>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-gray-100 text-xs font-semibold uppercase tracking-wide text-gray-600">
                <th className="px-3 py-2">Segment</th>
                <th className="px-3 py-2">Gifts</th>
                <th className="px-3 py-2">Total</th>
              </tr>
            </thead>
            <tbody>
              {Array.from(segmentTotals.entries())
                .sort((a, b) => b[1].total - a[1].total)
                .map(([key, data]) => (
                  <tr key={key} className="border-b border-gray-50 last:border-0">
                    <td className="px-3 py-2 font-medium text-gray-900">
                      {key === 'UNSPECIFIED' ? 'No segment set' : SEGMENT_LABELS[key as keyof typeof SEGMENT_LABELS]}
                    </td>
                    <td className="px-3 py-2 text-gray-600">{data.count}</td>
                    <td className="px-3 py-2 text-gray-600">{formatCurrency(data.total.toFixed(2))}</td>
                  </tr>
                ))}
              {segmentTotals.size === 0 && (
                <tr>
                  <td colSpan={3} className="px-3 py-6 text-center text-gray-500">
                    No gifts in the last 12 months.
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

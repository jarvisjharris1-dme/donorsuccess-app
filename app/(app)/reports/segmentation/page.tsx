import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { auth } from '@/auth';
import { forOrg } from '@/lib/tenant-db';
import { formatCurrency } from '@/lib/format';
import { SEGMENT_LABELS } from '@/lib/segments';
import { DONOR_TYPE_LABELS } from '@/lib/donor-types';
import DownloadCsvButton from '@/components/reports/DownloadCsvButton';

export default async function SegmentationReportPage() {
  const session = await auth();
  const db = forOrg(session!.user.organizationId);

  const [bySegment, byType] = await Promise.all([
    db.donor.groupBy({
      by: ['segment'],
      _count: { _all: true },
      _sum: { lifetimeGiving: true },
    }),
    db.donor.groupBy({
      by: ['donorType'],
      _count: { _all: true },
      _sum: { lifetimeGiving: true },
    }),
  ]);

  type GroupRow = { key: string | null; count: number; total: number };

  const segmentRows: GroupRow[] = (bySegment as { segment: string | null; _count: { _all: number }; _sum: { lifetimeGiving: unknown } }[])
    .map((g) => ({ key: g.segment, count: g._count._all, total: Number(g._sum.lifetimeGiving ?? 0) }))
    .sort((a, b) => b.total - a.total);

  const typeRows: GroupRow[] = (byType as { donorType: string; _count: { _all: number }; _sum: { lifetimeGiving: unknown } }[])
    .map((g) => ({ key: g.donorType, count: g._count._all, total: Number(g._sum.lifetimeGiving ?? 0) }))
    .sort((a, b) => b.total - a.total);

  const csvRows: (string | number)[][] = [
    ...segmentRows.map((r) => [
      'Segment',
      r.key ? SEGMENT_LABELS[r.key as keyof typeof SEGMENT_LABELS] : 'No segment set',
      r.count,
      r.total.toFixed(2),
    ]),
    ...typeRows.map((r) => [
      'Donor Type',
      r.key ? (DONOR_TYPE_LABELS[r.key as keyof typeof DONOR_TYPE_LABELS] ?? r.key) : '',
      r.count,
      r.total.toFixed(2),
    ]),
  ];

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
          <h1 className="text-2xl font-extrabold text-gray-900">Donor Segmentation</h1>
          <p className="mt-1 text-sm text-gray-600">
            Donor count and lifetime giving by segment and donor type.
          </p>
        </div>
        <DownloadCsvButton
          filename="donor-segmentation-report.csv"
          headers={['Group Type', 'Value', 'Donors', 'Lifetime Giving']}
          rows={csvRows}
        />
      </div>

      <div className="mt-6 rounded-[16px] border border-gray-200 bg-white p-6">
        <h2 className="text-[15px] font-bold text-gray-900">By segment</h2>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-gray-100 text-xs font-semibold uppercase tracking-wide text-gray-600">
                <th className="px-3 py-2">Segment</th>
                <th className="px-3 py-2">Donors</th>
                <th className="px-3 py-2">Lifetime giving</th>
                <th className="px-3 py-2">Avg per donor</th>
              </tr>
            </thead>
            <tbody>
              {segmentRows.map((r) => (
                <tr key={r.key ?? 'none'} className="border-b border-gray-50 last:border-0 hover:bg-gray-50">
                  <td className="px-3 py-2 font-medium">
                    <Link
                      href={`/reports/segmentation/donors?field=segment&value=${r.key ?? 'none'}`}
                      className="text-evergreen hover:text-[#0d685f]"
                    >
                      {r.key ? SEGMENT_LABELS[r.key as keyof typeof SEGMENT_LABELS] : 'No segment set'}
                    </Link>
                  </td>
                  <td className="px-3 py-2 text-gray-600">{r.count}</td>
                  <td className="px-3 py-2 text-gray-600">{formatCurrency(r.total.toFixed(2))}</td>
                  <td className="px-3 py-2 text-gray-600">
                    {formatCurrency((r.count > 0 ? r.total / r.count : 0).toFixed(2))}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="mt-6 rounded-[16px] border border-gray-200 bg-white p-6">
        <h2 className="text-[15px] font-bold text-gray-900">By donor type</h2>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-gray-100 text-xs font-semibold uppercase tracking-wide text-gray-600">
                <th className="px-3 py-2">Donor type</th>
                <th className="px-3 py-2">Donors</th>
                <th className="px-3 py-2">Lifetime giving</th>
              </tr>
            </thead>
            <tbody>
              {typeRows.map((r) => (
                <tr key={r.key} className="border-b border-gray-50 last:border-0 hover:bg-gray-50">
                  <td className="px-3 py-2 font-medium">
                    <Link
                      href={`/reports/segmentation/donors?field=donorType&value=${r.key ?? ''}`}
                      className="text-evergreen hover:text-[#0d685f]"
                    >
                      {r.key ? (DONOR_TYPE_LABELS[r.key as keyof typeof DONOR_TYPE_LABELS] ?? r.key) : '\u2014'}
                    </Link>
                  </td>
                  <td className="px-3 py-2 text-gray-600">{r.count}</td>
                  <td className="px-3 py-2 text-gray-600">{formatCurrency(r.total.toFixed(2))}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

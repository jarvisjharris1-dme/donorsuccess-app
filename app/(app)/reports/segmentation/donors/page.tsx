import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { auth } from '@/auth';
import { forOrg } from '@/lib/tenant-db';
import { formatCurrency, donorDisplayName } from '@/lib/format';
import { SEGMENT_LABELS } from '@/lib/segments';
import { DONOR_TYPE_LABELS } from '@/lib/donor-types';
import DownloadCsvButton from '@/components/reports/DownloadCsvButton';

export default async function SegmentationDrillThroughPage({
  searchParams,
}: {
  searchParams: { field?: string; value?: string };
}) {
  const session = await auth();
  const db = forOrg(session!.user.organizationId);

  const field = searchParams.field === 'donorType' ? 'donorType' : 'segment';
  const rawValue = searchParams.value;
  const isNone = rawValue === 'none';

  const donors = await db.donor.findMany({
    where: field === 'donorType' ? { donorType: rawValue as never } : { segment: isNone ? null : (rawValue as never) },
    orderBy: { lifetimeGiving: 'desc' },
    select: { id: true, firstName: true, lastName: true, organizationName: true, lifetimeGiving: true, email: true },
  });

  const groupLabel =
    field === 'donorType'
      ? (DONOR_TYPE_LABELS[rawValue as keyof typeof DONOR_TYPE_LABELS] ?? rawValue)
      : isNone
        ? 'No segment set'
        : SEGMENT_LABELS[rawValue as keyof typeof SEGMENT_LABELS];

  const total = donors.reduce((sum, d) => sum + Number(d.lifetimeGiving), 0);

  const csvRows: (string | number)[][] = donors.map((d) => [
    donorDisplayName(d),
    d.email ?? '',
    Number(d.lifetimeGiving).toFixed(2),
  ]);

  return (
    <div className="max-w-3xl">
      <Link
        href="/reports/segmentation"
        className="flex items-center gap-1.5 text-[13px] font-semibold text-gray-600 hover:text-gray-900"
      >
        <ArrowLeft size={14} />
        Segmentation
      </Link>

      <div className="mt-2 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-gray-900">{groupLabel}</h1>
          <p className="mt-1 text-sm text-gray-600">
            {donors.length} donor{donors.length === 1 ? '' : 's'} &middot; {formatCurrency(total.toFixed(2))} lifetime
            giving
          </p>
        </div>
        <DownloadCsvButton
          filename={`segmentation-${String(groupLabel).toLowerCase().replace(/\s+/g, '-')}.csv`}
          headers={['Donor', 'Email', 'Lifetime Giving']}
          rows={csvRows}
        />
      </div>

      <div className="mt-6 overflow-hidden rounded-[16px] border border-gray-200 bg-white">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-gray-100 text-xs font-semibold uppercase tracking-wide text-gray-600">
              <th className="px-5 py-3.5">Donor</th>
              <th className="px-5 py-3.5">Email</th>
              <th className="px-5 py-3.5">Lifetime giving</th>
            </tr>
          </thead>
          <tbody>
            {donors.length === 0 && (
              <tr>
                <td colSpan={3} className="px-5 py-8 text-center text-sm text-gray-600">
                  No donors in this group.
                </td>
              </tr>
            )}
            {donors.map((d) => (
              <tr key={d.id} className="border-b border-gray-50 last:border-0">
                <td className="px-5 py-3">
                  <Link href={`/donors/${d.id}`} className="font-semibold text-evergreen hover:text-[#0d685f]">
                    {donorDisplayName(d)}
                  </Link>
                </td>
                <td className="px-5 py-3 text-gray-700">{d.email ?? '—'}</td>
                <td className="px-5 py-3 font-semibold text-gray-900">
                  {formatCurrency(Number(d.lifetimeGiving).toFixed(2))}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

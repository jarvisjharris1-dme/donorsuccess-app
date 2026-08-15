import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { auth } from '@/auth';
import { forOrg } from '@/lib/tenant-db';
import { formatCurrency, formatDate, donorDisplayName } from '@/lib/format';
import DownloadCsvButton from '@/components/reports/DownloadCsvButton';

const MONTH_LABELS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

export default async function GivingSummaryMonthPage({ params }: { params: { monthKey: string } }) {
  const session = await auth();
  const db = forOrg(session!.user.organizationId);

  const [yearStr, monthStr] = params.monthKey.split('-');
  const year = Number(yearStr);
  const month = Number(monthStr);

  const startOfMonth = new Date(year, month, 1);
  const startOfNextMonth = new Date(year, month + 1, 1);

  const gifts = await db.gift.findMany({
    where: { date: { gte: startOfMonth, lt: startOfNextMonth } },
    orderBy: { date: 'desc' },
    include: { donor: { select: { id: true, firstName: true, lastName: true, organizationName: true } } },
  });

  const total = gifts.reduce((sum, g) => sum + Number(g.amount), 0);

  const csvRows: (string | number)[][] = gifts.map((g) => [
    formatDate(g.date.toISOString()),
    donorDisplayName(g.donor),
    Number(g.amount).toFixed(2),
  ]);

  const monthLabel = `${MONTH_LABELS[month] ?? 'Unknown'} ${year}`;

  return (
    <div className="max-w-3xl">
      <Link
        href="/reports/giving-summary"
        className="flex items-center gap-1.5 text-[13px] font-semibold text-gray-600 hover:text-gray-900"
      >
        <ArrowLeft size={14} />
        Giving Summary
      </Link>

      <div className="mt-2 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-gray-900">{monthLabel}</h1>
          <p className="mt-1 text-sm text-gray-600">
            {gifts.length} gift{gifts.length === 1 ? '' : 's'} &middot; {formatCurrency(total.toFixed(2))} total
          </p>
        </div>
        <DownloadCsvButton
          filename={`giving-${monthLabel.replace(' ', '-').toLowerCase()}.csv`}
          headers={['Date', 'Donor', 'Amount']}
          rows={csvRows}
        />
      </div>

      <div className="mt-6 overflow-hidden rounded-[16px] border border-gray-200 bg-white">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-gray-100 text-xs font-semibold uppercase tracking-wide text-gray-600">
              <th className="px-5 py-3.5">Date</th>
              <th className="px-5 py-3.5">Donor</th>
              <th className="px-5 py-3.5">Amount</th>
            </tr>
          </thead>
          <tbody>
            {gifts.length === 0 && (
              <tr>
                <td colSpan={3} className="px-5 py-8 text-center text-sm text-gray-600">
                  No gifts recorded this month.
                </td>
              </tr>
            )}
            {gifts.map((g) => (
              <tr key={g.id} className="border-b border-gray-50 last:border-0">
                <td className="px-5 py-3 text-gray-700">{formatDate(g.date.toISOString())}</td>
                <td className="px-5 py-3">
                  <Link href={`/donors/${g.donor.id}`} className="font-semibold text-evergreen hover:text-[#0d685f]">
                    {donorDisplayName(g.donor)}
                  </Link>
                </td>
                <td className="px-5 py-3 font-semibold text-gray-900">
                  {formatCurrency(Number(g.amount).toFixed(2))}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

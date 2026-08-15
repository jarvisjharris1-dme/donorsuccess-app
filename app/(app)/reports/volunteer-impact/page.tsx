import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { auth } from '@/auth';
import { forOrg } from '@/lib/tenant-db';
import { formatCurrency, formatDate, donorDisplayName } from '@/lib/format';
import DownloadCsvButton from '@/components/reports/DownloadCsvButton';

const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export default async function VolunteerImpactReportPage() {
  const session = await auth();
  const db = forOrg(session!.user.organizationId);

  const oneYearAgo = new Date();
  oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);

  const entries: {
    id: string;
    date: Date;
    hours: unknown;
    dollarValue: unknown;
    activity: string;
    donor: { id: string; firstName: string | null; lastName: string | null; organizationName: string | null };
  }[] = await db.volunteerHours.findMany({
    orderBy: { date: 'desc' },
    include: { donor: { select: { id: true, firstName: true, lastName: true, organizationName: true } } },
  });

  const totalHoursAllTime = entries.reduce((sum, e) => sum + Number(e.hours), 0);
  const totalValueAllTime = entries.reduce((sum, e) => sum + Number(e.dollarValue), 0);

  const entriesLast12Months = entries.filter((e) => e.date >= oneYearAgo);
  const totalHoursLast12Months = entriesLast12Months.reduce((sum, e) => sum + Number(e.hours), 0);
  const totalValueLast12Months = entriesLast12Months.reduce((sum, e) => sum + Number(e.dollarValue), 0);

  const uniqueVolunteerIds = new Set(entries.map((e) => e.donor.id));

  const hoursByDonor = new Map<string, { donor: (typeof entries)[number]['donor']; hours: number; value: number }>();
  for (const e of entries) {
    const existing = hoursByDonor.get(e.donor.id);
    if (existing) {
      existing.hours += Number(e.hours);
      existing.value += Number(e.dollarValue);
    } else {
      hoursByDonor.set(e.donor.id, { donor: e.donor, hours: Number(e.hours), value: Number(e.dollarValue) });
    }
  }
  const topVolunteers = Array.from(hoursByDonor.values())
    .sort((a, b) => b.hours - a.hours)
    .slice(0, 10);

  const months: { key: string; label: string; hours: number }[] = [];
  const cursor = new Date(oneYearAgo);
  cursor.setDate(1);
  const now = new Date();
  while (cursor <= now) {
    months.push({ key: `${cursor.getFullYear()}-${cursor.getMonth()}`, label: MONTH_LABELS[cursor.getMonth()], hours: 0 });
    cursor.setMonth(cursor.getMonth() + 1);
  }
  const monthIndex = new Map(months.map((m) => [m.key, m]));
  for (const e of entriesLast12Months) {
    const key = `${e.date.getFullYear()}-${e.date.getMonth()}`;
    const bucket = monthIndex.get(key);
    if (bucket) bucket.hours += Number(e.hours);
  }
  const maxMonthHours = Math.max(1, ...months.map((m) => m.hours));

  const csvRows: (string | number)[][] = entries.map((e) => [
    formatDate(e.date.toISOString()),
    donorDisplayName(e.donor),
    Number(e.hours).toFixed(2),
    Number(e.dollarValue).toFixed(2),
    e.activity,
  ]);

  return (
    <div className="max-w-5xl">
      <Link href="/reports" className="flex items-center gap-1.5 text-[13px] font-semibold text-gray-600 hover:text-gray-900">
        <ArrowLeft size={14} />
        Reports
      </Link>

      <div className="mt-2 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-gray-900">Volunteer Impact</h1>
          <p className="mt-1 text-sm text-gray-600">
            An estimated value of contributed time — for grant reporting and impact storytelling,
            never blended into giving totals or treated as a tax-deductible gift.
          </p>
        </div>
        <DownloadCsvButton
          filename="volunteer-impact.csv"
          headers={['Date', 'Donor', 'Hours', 'Estimated Value', 'Activity']}
          rows={csvRows}
        />
      </div>

      <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-5">
        <div className="rounded-[14px] border border-gray-200 bg-white p-4">
          <div className="text-[11px] font-semibold uppercase tracking-wide text-gray-600">Volunteers</div>
          <div className="mt-1 text-lg font-extrabold text-gray-900">{uniqueVolunteerIds.size}</div>
        </div>
        <div className="rounded-[14px] border border-gray-200 bg-white p-4">
          <div className="text-[11px] font-semibold uppercase tracking-wide text-gray-600">Hours (12 mo)</div>
          <div className="mt-1 text-lg font-extrabold text-gray-900">{totalHoursLast12Months.toFixed(1)}</div>
        </div>
        <div className="rounded-[14px] border border-gray-200 bg-white p-4">
          <div className="text-[11px] font-semibold uppercase tracking-wide text-gray-600">Value (12 mo)</div>
          <div className="mt-1 text-lg font-extrabold text-evergreen">
            {formatCurrency(totalValueLast12Months.toFixed(2))}
          </div>
        </div>
        <div className="rounded-[14px] border border-gray-200 bg-white p-4">
          <div className="text-[11px] font-semibold uppercase tracking-wide text-gray-600">Hours (all time)</div>
          <div className="mt-1 text-lg font-extrabold text-gray-900">{totalHoursAllTime.toFixed(1)}</div>
        </div>
        <div className="rounded-[14px] border border-gray-200 bg-white p-4">
          <div className="text-[11px] font-semibold uppercase tracking-wide text-gray-600">Value (all time)</div>
          <div className="mt-1 text-lg font-extrabold text-gray-900">
            {formatCurrency(totalValueAllTime.toFixed(2))}
          </div>
        </div>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <div className="rounded-[16px] border border-gray-200 bg-white p-6">
          <h2 className="text-[15px] font-bold text-gray-900">Monthly Trend (last 12 months)</h2>
          <div className="mt-5 flex h-40 items-end gap-2">
            {months.map((m) => (
              <div key={m.key} className="flex flex-1 flex-col items-center gap-1.5">
                <div
                  className="w-full rounded-t-md bg-evergreen/80"
                  style={{ height: `${Math.max(4, (m.hours / maxMonthHours) * 100)}%` }}
                  title={`${m.label}: ${m.hours.toFixed(1)} hrs`}
                />
                <span className="text-[10px] font-medium text-gray-500">{m.label}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-[16px] border border-gray-200 bg-white p-6">
          <h2 className="text-[15px] font-bold text-gray-900">Top Volunteers (all time)</h2>
          <div className="mt-3 flex flex-col divide-y divide-gray-50">
            {topVolunteers.length === 0 && <p className="py-3 text-sm text-gray-600">No volunteer hours logged yet.</p>}
            {topVolunteers.map((v) => (
              <div key={v.donor.id} className="flex items-center justify-between gap-3 py-2.5">
                <Link href={`/donors/${v.donor.id}`} className="font-medium text-evergreen hover:text-[#0d685f]">
                  {donorDisplayName(v.donor)}
                </Link>
                <div className="text-right text-sm text-gray-700">
                  <span className="font-semibold text-gray-900">{v.hours.toFixed(1)} hrs</span>
                  <span className="ml-2 text-gray-500">{formatCurrency(v.value.toFixed(2))}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

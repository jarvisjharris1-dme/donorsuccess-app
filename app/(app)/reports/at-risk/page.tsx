import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { auth } from '@/auth';
import { forOrg } from '@/lib/tenant-db';
import { formatDate, formatCurrency, donorDisplayName } from '@/lib/format';
import { RetentionRiskBadge } from '@/components/donors/Badges';
import { RetentionRisk } from '@prisma/client';
import DownloadCsvButton from '@/components/reports/DownloadCsvButton';

export default async function AtRiskReportPage() {
  const session = await auth();
  const db = forOrg(session!.user.organizationId);

  const donors: {
    id: string;
    firstName: string | null;
    lastName: string | null;
    organizationName: string | null;
    email: string | null;
    retentionRisk: RetentionRisk | null;
    healthScore: number | null;
    lastGiftDate: Date | null;
    lifetimeGiving: unknown;
    assignedTo: { name: string | null; email: string } | null;
  }[] = await db.donor.findMany({
    where: { retentionRisk: { in: [RetentionRisk.HIGH, RetentionRisk.CRITICAL] } },
    orderBy: [{ retentionRisk: 'asc' }, { lastGiftDate: 'asc' }],
    select: {
      id: true,
      firstName: true,
      lastName: true,
      organizationName: true,
      email: true,
      retentionRisk: true,
      healthScore: true,
      lastGiftDate: true,
      lifetimeGiving: true,
      assignedTo: { select: { name: true, email: true } },
    },
  });

  const now = Date.now();
  const daysSince = (date: Date | null) =>
    date ? Math.floor((now - date.getTime()) / 86_400_000) : null;

  const csvRows: (string | number)[][] = donors.map((d) => [
    donorDisplayName(d),
    d.email ?? '',
    d.retentionRisk ?? '',
    d.healthScore ?? '',
    formatDate(d.lastGiftDate),
    d.assignedTo?.name ?? d.assignedTo?.email ?? 'Unassigned',
  ]);

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
          <h1 className="text-2xl font-extrabold text-gray-900">Lapsed &amp; At-Risk Donors</h1>
          <p className="mt-1 text-sm text-gray-600">
            High and critical retention risk donors, sorted by urgency — ready to work.
          </p>
        </div>
        <DownloadCsvButton
          filename="at-risk-donors-report.csv"
          headers={['Donor', 'Email', 'Risk', 'Health Score', 'Last Gift', 'Assigned To']}
          rows={csvRows}
        />
      </div>

      <div className="mt-6 rounded-[16px] border border-gray-200 bg-white p-6">
        <div className="font-display text-[28px] font-extrabold text-gray-900">{donors.length}</div>
        <div className="mt-1 text-[13px] font-medium text-gray-600">Donors needing attention</div>
      </div>

      <div className="mt-6 rounded-[16px] border border-gray-200 bg-white p-6">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-gray-100 text-xs font-semibold uppercase tracking-wide text-gray-600">
                <th className="px-3 py-2">Donor</th>
                <th className="px-3 py-2">Risk</th>
                <th className="px-3 py-2">Health</th>
                <th className="px-3 py-2">Last gift</th>
                <th className="px-3 py-2">Days since</th>
                <th className="px-3 py-2">Lifetime giving</th>
                <th className="px-3 py-2">Assigned to</th>
              </tr>
            </thead>
            <tbody>
              {donors.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-3 py-8 text-center text-gray-500">
                    No high or critical risk donors right now.
                  </td>
                </tr>
              )}
              {donors.map((d) => (
                <tr key={d.id} className="border-b border-gray-50 last:border-0">
                  <td className="px-3 py-2">
                    <Link href={`/donors/${d.id}`} className="font-medium text-evergreen hover:text-[#0d685f]">
                      {donorDisplayName(d)}
                    </Link>
                  </td>
                  <td className="px-3 py-2">
                    {d.retentionRisk && <RetentionRiskBadge risk={d.retentionRisk} />}
                  </td>
                  <td className="px-3 py-2 text-gray-600">{d.healthScore ?? '—'}</td>
                  <td className="px-3 py-2 text-gray-600">{formatDate(d.lastGiftDate)}</td>
                  <td className="px-3 py-2 text-gray-600">
                    {daysSince(d.lastGiftDate) !== null ? `${daysSince(d.lastGiftDate)}d` : '—'}
                  </td>
                  <td className="px-3 py-2 text-gray-600">
                    {formatCurrency(Number(d.lifetimeGiving).toFixed(2))}
                  </td>
                  <td className="px-3 py-2 text-gray-600">
                    {d.assignedTo?.name ?? d.assignedTo?.email ?? 'Unassigned'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
